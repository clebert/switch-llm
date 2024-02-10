const std = @import("std");
const llama = @import("llama.zig");

pub const Chat = struct {
    template: Template,
    messages: []const Message,
    sampling_params: llama.SamplingParams,
};

pub const Template = enum {
    /// https://huggingface.co/google/gemma-7b-it/blob/main/tokenizer_config.json
    gemma,

    /// https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/blob/main/tokenizer_config.json
    llama,

    /// https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/blob/main/tokenizer_config.json
    /// https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1/blob/main/tokenizer_config.json
    mistral,
};

pub const Message = struct { role: Role, content: []const u8 };
pub const Role = enum { assistant, user };

allocator: std.mem.Allocator,
context: *llama.Context,
template: Template,
tokens: []const llama.Token,
sampling_params: llama.SamplingParams,

pub fn init(allocator: std.mem.Allocator, context: *llama.Context, chat: Chat) !@This() {
    if (chat.messages.len == 0) return error.NoMessages;
    if (chat.messages[chat.messages.len - 1].role != .user) return error.UnexpectedRole;

    var text = std.ArrayList(u8).init(allocator);

    defer text.deinit();

    switch (chat.template) {
        .gemma => {
            for (chat.messages, 0..) |message, index| {
                if ((message.role == .user) != (index % 2 == 0)) return error.UnexpectedRole;

                try text.appendSlice("<start_of_turn>");
                try text.appendSlice(if (message.role == .user) "user" else "model");
                try text.appendSlice("\n");
                try text.appendSlice(try trimContent(message));
                try text.appendSlice("<end_of_turn>\n");
            }

            try text.appendSlice("<start_of_turn>model\n");
        },

        .llama => {
            for (chat.messages, 0..) |message, index| {
                if ((message.role == .user) != (index % 2 == 0)) return error.UnexpectedRole;

                if (message.role == .user) {
                    try text.appendSlice("<s>[INST] ");
                    try text.appendSlice(try trimContent(message));
                    try text.appendSlice(" [/INST]");
                } else {
                    try text.appendSlice(" ");
                    try text.appendSlice(try trimContent(message));
                    try text.appendSlice(" </s>");
                }
            }

            try text.appendSlice(" ");
        },

        .mistral => {
            try text.appendSlice("<s>");

            for (chat.messages, 0..) |message, index| {
                if ((message.role == .user) != (index % 2 == 0)) return error.UnexpectedRole;

                if (message.role == .user) {
                    try text.appendSlice("[INST] ");
                    try text.appendSlice(try trimContent(message));
                    try text.appendSlice(" [/INST]");
                } else {
                    try text.appendSlice(try trimContent(message));
                    try text.appendSlice("</s>");
                }
            }
        },
    }

    const tokens = try context.tokenize(allocator, text.items, false);

    errdefer allocator.free(tokens);

    return .{
        .allocator = allocator,
        .context = context,
        .template = chat.template,
        .tokens = tokens,
        .sampling_params = chat.sampling_params,
    };
}

pub fn deinit(self: *@This()) void {
    self.allocator.free(self.tokens);

    self.* = undefined;
}

pub fn respond(self: *@This(), response: *std.http.Server.Response) !void {
    var result = try self.context.generate(self.allocator, self.tokens, self.sampling_params);

    defer result.deinit();

    var first = true;

    while (true) {
        defer first = false;

        switch (result) {
            .completion => |completion| {
                const content_delta = if (first)
                    std.mem.trimLeft(u8, completion.content_delta, &std.ascii.whitespace)
                else
                    completion.content_delta;

                try response.writeAll("data: ");
                try std.json.stringify(.{ .content_delta = content_delta }, .{}, response.writer());
                try response.writeAll("\n");
                try response.flush();

                result.deinit();

                result = try self.context.generate(
                    self.allocator,
                    &.{completion.token},
                    self.sampling_params,
                );
            },

            .context_size => {
                try response.writeAll("data: {\"finish_reason\":\"context_size\"}\n");
                try response.flush();

                break;
            },

            .stop => {
                try response.writeAll("data: {\"finish_reason\":\"stop\"}\n");
                try response.flush();

                break;
            },
        }
    }

    try response.writeAll("data: [DONE]\n");
    try response.end();
}

fn trimContent(message: Message) ![]const u8 {
    const content = std.mem.trim(u8, message.content, &std.ascii.whitespace);

    if (content.len == 0) return error.BlankContent;

    return content;
}
