const root = @import("root");
const std = @import("std");
const llama = @import("llama.zig");

const log = std.log.scoped(.server);

pub fn start(preferred_port: ?u16) !void {
    var tcp_server = try listen(preferred_port orelse 0);

    defer tcp_server.deinit();

    log.info("listening on http://localhost:{}", .{tcp_server.listen_address.getPort()});

    while (true) {
        var connection = try tcp_server.accept();

        errdefer connection.stream.close();

        const thread = try std.Thread.spawn(.{}, connectionHandler, .{connection});

        thread.detach();
    }
}

fn listen(preferred_port: u16) !std.net.Server {
    const preferred_address = try std.net.Address.parseIp("127.0.0.1", preferred_port);

    return preferred_address.listen(.{ .reuse_address = true }) catch |err| {
        if (err == error.AddressInUse) {
            const address = try std.net.Address.parseIp("127.0.0.1", 0);

            return try address.listen(.{ .reuse_address = true });
        } else return err;
    };
}

fn connectionHandler(connection: std.net.Server.Connection) void {
    defer connection.stream.close();

    var read_buffer: [8000]u8 = undefined;
    var http_server = std.http.Server.init(connection, &read_buffer);

    var request = http_server.receiveHead() catch |err| {
        log.err("error while receiving request: {s}", .{@errorName(err)});

        return;
    };

    root.requestHandler(&request) catch |err| {
        log.err("error while responding to request: {s}", .{@errorName(err)});

        request.respond("", .{ .status = .internal_server_error, .keep_alive = false }) catch {};
    };
}
