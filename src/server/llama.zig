const builtin = @import("builtin");
const std = @import("std");

const c = @cImport({
    @cDefine("GGML_UNREACHABLE", "unreachable");
    @cInclude("llama.h");
});

pub fn initBackend() void {
    const Logger = struct {
        fn log(level: c.enum_ggml_log_level, text: [*c]const u8, _: ?*anyopaque) callconv(.C) void {
            if (level == c.GGML_LOG_LEVEL_ERROR or builtin.mode == .Debug) {
                std.io.getStdErr().writer().print("{s}", .{text}) catch return;
            }
        }
    };

    c.llama_log_set(Logger.log, null);
    c.llama_backend_init();
}

pub fn deinitBackend() void {
    defer c.llama_backend_free();
}

pub const Model = struct {
    allocator: std.mem.Allocator,
    path: []const u8,
    ptr: *c.llama_model,
    max_context_size: usize,
    vocab_type: VocabType,
    vocab_size: usize,
    eos_token: Token,
    add_bos_token: bool,

    pub fn init(allocator: std.mem.Allocator, path: []const u8) !@This() {
        const owned_path = try allocator.dupe(u8, path);

        errdefer allocator.free(owned_path);

        const c_path = try allocator.dupeZ(u8, owned_path);

        defer allocator.free(c_path);

        var params = c.llama_model_default_params();

        // https://github.com/ggerganov/llama.cpp/blob/89febfed9322c8849520dc63c93ee4f5fd72556e/llama.cpp#L11321
        params.n_gpu_layers = 999;

        const ptr = c.llama_load_model_from_file(c_path, params) orelse
            return error.FailedToLoadModel;

        errdefer c.llama_free_model(ptr);

        const vocab_type: VocabType = switch (c.llama_vocab_type(ptr)) {
            c.LLAMA_VOCAB_TYPE_SPM => .SentencePiece,
            c.LLAMA_VOCAB_TYPE_BPE => .BytePairEncoding,
            else => .Unknown,
        };

        const add_bos_token = switch (c.llama_add_bos_token(ptr)) {
            1 => true,
            0 => false,
            else => vocab_type == .SentencePiece,
        };

        return .{
            .allocator = allocator,
            .path = owned_path,
            .ptr = ptr,
            .max_context_size = @intCast(c.llama_n_ctx_train(ptr)),
            .vocab_type = vocab_type,
            .vocab_size = @intCast(c.llama_n_vocab(ptr)),
            .eos_token = c.llama_token_eos(ptr),
            .add_bos_token = add_bos_token,
        };
    }

    pub fn deinit(self: *@This()) void {
        c.llama_free_model(self.ptr);
        self.allocator.free(self.path);

        self.* = undefined;
    }

    pub fn getPiece(self: @This(), allocator: std.mem.Allocator, token: Token) ![]u8 {
        if (self.vocab_type != .SentencePiece) {
            return error.UnsupportedVocabType;
        }

        var piece = std.ArrayList(u8).init(allocator);

        errdefer piece.deinit();

        switch (c.llama_token_get_type(self.ptr, token)) {
            c.LLAMA_TOKEN_TYPE_UNDEFINED => {},

            c.LLAMA_TOKEN_TYPE_NORMAL => {
                const text = std.mem.span(c.llama_token_get_text(self.ptr, token));
                const whitespace = "▁";
                const whitespace_count = std.mem.count(u8, text, whitespace);

                if (whitespace_count > 0) {
                    _ = std.mem.replace(
                        u8,
                        text,
                        whitespace,
                        " ",
                        try piece.addManyAsSlice(text.len - (whitespace_count * (whitespace.len - 1))),
                    );
                } else {
                    try piece.appendSlice(text);
                }
            },

            c.LLAMA_TOKEN_TYPE_UNKNOWN => {
                try piece.appendSlice("�");
            },

            c.LLAMA_TOKEN_TYPE_CONTROL => {},

            c.LLAMA_TOKEN_TYPE_USER_DEFINED => {
                const text = std.mem.span(c.llama_token_get_text(self.ptr, token));

                try piece.appendSlice(text);
            },

            c.LLAMA_TOKEN_TYPE_UNUSED => {},

            c.LLAMA_TOKEN_TYPE_BYTE => {
                const text = std.mem.span(c.llama_token_get_text(self.ptr, token));

                try piece.append(try std.fmt.parseInt(u8, text[3..5], 16));
            },

            else => {},
        }

        return piece.toOwnedSlice();
    }
};

pub const VocabType = union(enum) { SentencePiece, BytePairEncoding, Unknown };
pub const Token = c.llama_token;

// https://github.com/ggerganov/llama.cpp/issues/5070#issuecomment-1929168936
const batch_size = 512;

pub const Context = struct {
    allocator: std.mem.Allocator,
    candidates: []c.llama_token_data,
    ptr: *c.llama_context,
    model: Model,
    size: usize,
    pos: usize = 0,

    pub fn init(allocator: std.mem.Allocator, model: Model, options: ContextOptions) !@This() {
        const candidates = try allocator.alloc(c.llama_token_data, model.vocab_size);

        errdefer allocator.free(candidates);

        var params = c.llama_context_default_params();

        params.n_ctx = @intCast(options.size orelse model.max_context_size);
        params.n_batch = batch_size;
        params.n_threads = @intCast(options.thread_count orelse try std.Thread.getCpuCount());
        params.n_threads_batch = params.n_threads;

        const ptr = c.llama_new_context_with_model(model.ptr, params) orelse
            return error.FailedToCreateContext;

        errdefer c.llama_free(ptr);

        return .{
            .allocator = allocator,
            .candidates = candidates,
            .ptr = ptr,
            .model = model,
            .size = @intCast(params.n_ctx),
        };
    }

    pub fn deinit(self: *@This()) void {
        c.llama_free(self.ptr);
        self.allocator.free(self.candidates);

        self.* = undefined;
    }

    pub fn decode(self: *@This(), tokens: []const Token, output_logits: bool) !?[]f32 {
        if (tokens.len == 0) return error.NothingToDecode;
        if (tokens.len > batch_size) return error.BatchSizeExceeded;
        if (self.pos + tokens.len > self.size) return error.ContextSizeExceeded;

        var batch = c.llama_batch_init(@intCast(tokens.len), 0, 1);

        defer c.llama_batch_free(batch);

        batch.n_tokens = @intCast(tokens.len);

        const last_token_index = tokens.len - 1;

        for (tokens, 0..) |token, index| {
            batch.token[index] = token;
            batch.pos[index] = @intCast(self.pos + index);
            batch.n_seq_id[index] = 1;
            batch.seq_id[index][0] = 0;
            batch.logits[index] = if (output_logits and index == last_token_index) 1 else 0;
        }

        if (c.llama_decode(self.ptr, batch) < 0) {
            return error.DecodeFailed;
        }

        if (!output_logits) return null;

        self.pos += tokens.len;

        const logits = c.llama_get_logits_ith(self.ptr, @intCast(last_token_index));

        return logits[0..self.model.vocab_size];
    }

    pub fn generate(
        self: *@This(),
        allocator: std.mem.Allocator,
        tokens: []const Token,
        sampling_params: SamplingParams,
    ) !Result {
        const batch_count = (tokens.len + batch_size - 1) / batch_size;

        var last_logits: ?[]f32 = null;

        for (0..batch_count) |index| {
            const last_batch = index == batch_count - 1;
            const token_count = if (last_batch) tokens.len % batch_size else batch_size;
            const batch = tokens[index * batch_size ..][0..token_count];

            last_logits = self.decode(batch, last_batch) catch |err| {
                switch (err) {
                    error.ContextSizeExceeded => return .context_size,
                    else => return err,
                }
            };
        }

        if (last_logits) |logits| {
            const token = try self.sample(logits, sampling_params);

            return if (token != self.model.eos_token) .{
                .completion = .{
                    .allocator = allocator,
                    .content_delta = try self.model.getPiece(allocator, token),
                    .token = token,
                },
            } else .stop;
        }

        return error.NothingToGenerate;
    }

    pub fn printTimings(self: @This()) void {
        c.llama_print_timings(self.ptr);
    }

    pub fn sample(self: @This(), logits: []const f32, sampling_params: SamplingParams) !Token {
        std.debug.assert(logits.len == self.candidates.len);

        for (self.candidates, 0..) |*candidate, index| {
            candidate.* = .{ .id = @intCast(index), .logit = logits[index], .p = 0 };
        }

        var candidates: c.llama_token_data_array = .{
            .data = self.candidates.ptr,
            .size = self.candidates.len,
            .sorted = false,
        };

        if (sampling_params.temperature <= 0) {
            return c.llama_sample_token_greedy(self.ptr, &candidates);
        }

        c.llama_sample_temp(self.ptr, &candidates, sampling_params.temperature);

        if (sampling_params.top_p) |top_p| {
            c.llama_sample_top_p(self.ptr, &candidates, top_p, 1);
        }

        return c.llama_sample_token(self.ptr, &candidates);
    }

    pub fn tokenize(
        self: @This(),
        allocator: std.mem.Allocator,
        text: []const u8,
        add_bos_token: ?bool,
    ) ![]Token {
        const max_tokens = try allocator.alloc(Token, self.size);

        defer allocator.free(max_tokens);

        const token_count = c.llama_tokenize(
            self.model.ptr,
            text.ptr,
            @intCast(text.len),
            max_tokens.ptr,
            @intCast(max_tokens.len),
            add_bos_token orelse self.model.add_bos_token,
            true,
        );

        if (token_count < 0) {
            return error.TokenizeFailed;
        }

        const tokens = try allocator.alloc(Token, @intCast(token_count));

        errdefer allocator.free(tokens);

        std.mem.copyForwards(Token, tokens, max_tokens[0..tokens.len]);

        return tokens;
    }
};

pub const ContextOptions = struct {
    size: ?usize = null,
    thread_count: ?usize = null,
};

pub const SamplingParams = struct {
    /// https://github.com/ggerganov/llama.cpp/tree/master/examples/main#temperature
    temperature: f32,

    /// https://github.com/ggerganov/llama.cpp/tree/master/examples/main#top-p-sampling
    top_p: ?f32,
};

pub const Result = union(enum) {
    completion: Completion,
    context_size,
    stop,

    pub fn deinit(self: *@This()) void {
        switch (self.*) {
            .completion => |*completion| completion.deinit(),
            else => {},
        }

        self.* = undefined;
    }
};

pub const Completion = struct {
    allocator: std.mem.Allocator,
    content_delta: []const u8,
    token: Token,

    pub fn deinit(self: *@This()) void {
        self.allocator.free(self.content_delta);

        self.* = undefined;
    }
};
