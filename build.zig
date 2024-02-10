const std = @import("std");

const allocator = std.heap.page_allocator;

pub fn build(b: *std.Build) !void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    if (target.result.os.tag != .macos) {
        @panic("Only macos is supported.");
    }

    const server_exe = b.addExecutable(.{
        .name = "server",
        .root_source_file = .{ .path = "src/server/main.zig" },
        .target = target,
        .optimize = optimize,
        .strip = optimize != .Debug,
    });

    try addLlama(server_exe);

    const server_install_artifact = b.addInstallArtifact(server_exe, .{});

    b.getInstallStep().dependOn(&server_install_artifact.step);

    // TODO: https://github.com/ggerganov/llama.cpp/issues/5376
    const ggml_metal_install_file = b.addInstallFileWithDir(
        .{ .path = "llama.cpp/ggml-metal.metal" },
        .bin,
        "../../ggml-metal.metal",
    );

    b.getInstallStep().dependOn(&ggml_metal_install_file.step);

    const run_step = b.step("run", "Run the server");

    run_step.dependOn(b.getInstallStep());

    const run_artifact = b.addRunArtifact(server_exe);

    run_step.dependOn(&run_artifact.step);
}

fn addLlama(compile: *std.Build.Step.Compile) !void {
    const optimize = compile.root_module.optimize.?;

    compile.addIncludePath(.{ .path = "llama.cpp" });

    const c_flags = try createFlags(optimize, false);

    defer allocator.free(c_flags);

    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/ggml.c" }, .flags = c_flags });
    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/ggml-alloc.c" }, .flags = c_flags });
    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/ggml-backend.c" }, .flags = c_flags });
    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/ggml-metal.m" }, .flags = c_flags });
    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/ggml-quants.c" }, .flags = c_flags });

    const cpp_flags = try createFlags(optimize, true);

    defer allocator.free(cpp_flags);

    compile.addCSourceFile(.{ .file = .{ .path = "llama.cpp/llama.cpp" }, .flags = cpp_flags });

    compile.linkFramework("Accelerate");
    compile.linkFramework("Foundation");
    compile.linkFramework("Metal");
    compile.linkFramework("MetalKit");
    compile.linkLibC();
    compile.linkLibCpp();
}

fn createFlags(optimize: std.builtin.OptimizeMode, cpp: bool) ![][]const u8 {
    var flags = std.ArrayList([]const u8).init(allocator);

    errdefer flags.deinit();

    try flags.appendSlice(&.{
        if (cpp) "-std=c++11" else "-std=c11",
        "-DGGML_USE_ACCELERATE",
        "-DACCELERATE_NEW_LAPACK",
        "-DACCELERATE_LAPACK_ILP64",
        "-DGGML_USE_METAL",
    });

    if (optimize != .Debug) {
        try flags.appendSlice(&.{ "-DNDEBUG", "-DGGML_METAL_NDEBUG" });
    }

    return flags.toOwnedSlice();
}
