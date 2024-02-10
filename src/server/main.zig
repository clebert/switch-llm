const builtin = @import("builtin");
const std = @import("std");
const llama = @import("llama.zig");
const Prompt = @import("prompt.zig");
const server = @import("server.zig");

pub const std_options = std.Options{ .log_level = std.log.Level.info };

pub fn main() !void {
    llama.initBackend();

    defer llama.deinitBackend();

    try server.start(3000);
}

pub fn requestHandler(request: *std.http.Server.Request) !void {
    if (try sendCompletions(request)) return;
    if (try sendStatic(request, "app.css")) return;
    if (try sendStatic(request, "app.js")) return;
    if (try sendStatic(request, "codicon-KO3A7BXW.ttf")) return;
    if (try sendStatic(request, "css.worker.js")) return;
    if (try sendStatic(request, "editor.worker.js")) return;
    if (try sendStatic(request, "html.worker.js")) return;
    if (try sendStatic(request, "index.html")) return;
    if (try sendStatic(request, "json.worker.js")) return;
    if (try sendStatic(request, "ts.worker.js")) return;

    _ = try sendEmpty(request, .not_found);
}

const allocator = std.heap.c_allocator;

var mutex: std.Thread.Mutex = .{};

fn sendCompletions(request: *std.http.Server.Request) !bool {
    if (!isRoute(request, .POST, "/completions")) return false;

    if (request.head.content_type) |content_type| {
        if (!std.mem.eql(u8, content_type, "application/json"))
            return sendEmpty(request, .bad_request);
    } else return sendEmpty(request, .bad_request);

    const reader = try request.reader();
    const content = try reader.readAllAlloc(allocator, std.math.maxInt(usize));

    defer allocator.free(content);

    const parsed = std.json.parseFromSlice(struct {
        model_path: []const u8,
        template: Prompt.Template,
        messages: []const Prompt.Message,
        sampling_params: llama.SamplingParams,
    }, allocator, content, .{}) catch return sendEmpty(request, .bad_request);

    defer parsed.deinit();

    if (!mutex.tryLock()) return sendEmpty(request, .service_unavailable);

    defer mutex.unlock();

    var model = try llama.Model.init(allocator, parsed.value.model_path);

    defer model.deinit();

    var context = try llama.Context.init(allocator, model, .{});

    defer context.deinit();

    // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
    const char_count_per_token = 4;
    const send_buffer = try allocator.alloc(u8, model.max_context_size * char_count_per_token);

    defer allocator.free(send_buffer);

    var response = request.respondStreaming(.{
        .send_buffer = send_buffer,

        .respond_options = .{
            .keep_alive = false,
            .transfer_encoding = .chunked,

            .extra_headers = &.{
                .{ .name = "connection", .value = "close" },
                .{ .name = "content-type", .value = "text/event-stream" },
            },
        },
    });

    var prompt = try Prompt.init(allocator, &context, .{
        .template = parsed.value.template,
        .messages = parsed.value.messages,
        .sampling_params = parsed.value.sampling_params,
    });

    defer prompt.deinit();

    try prompt.respond(&response);

    return true;
}

fn sendStatic(request: *std.http.Server.Request, comptime filename: []const u8) !bool {
    if (std.mem.eql(u8, filename, "index.html")) {
        if (!isRoute(request, .GET, "/")) return false;
    } else if (!isRoute(request, .GET, "/static/" ++ filename)) return false;

    const extra_headers = [_]std.http.Header{
        .{ .name = "connection", .value = "close" },
        .{ .name = "content-type", .value = comptime getContentType(filename) },
        .{ .name = "cache-control", .value = "no-store" },
    };

    if (builtin.mode == .Debug) {
        const file = try std.fs.cwd().openFile("dist/" ++ filename, .{});

        defer file.close();

        const content = try file.readToEndAlloc(allocator, std.math.maxInt(usize));

        defer allocator.free(content);

        try request.respond(content, .{ .keep_alive = false, .extra_headers = &extra_headers });
    } else {
        const content = @embedFile("static/" ++ filename);

        try request.respond(content, .{ .keep_alive = false, .extra_headers = &extra_headers });
    }

    return true;
}

fn sendEmpty(request: *std.http.Server.Request, status: std.http.Status) !bool {
    try request.respond("", .{
        .status = status,
        .keep_alive = false,
        .extra_headers = &.{.{ .name = "connection", .value = "close" }},
    });

    return true;
}

fn isRoute(request: *std.http.Server.Request, method: std.http.Method, target: []const u8) bool {
    return request.head.method == method and std.mem.eql(u8, request.head.target, target);
}

fn getContentType(path: []const u8) []const u8 {
    const extension = std.fs.path.extension(path);

    if (std.mem.eql(u8, extension, ".css")) return "text/css; charset=utf-8";
    if (std.mem.eql(u8, extension, ".html")) return "text/html; charset=utf-8";
    if (std.mem.eql(u8, extension, ".js")) return "application/javascript; charset=utf-8";
    if (std.mem.eql(u8, extension, ".ttf")) return "font/ttf";
}
