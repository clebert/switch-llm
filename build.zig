const std = @import("std");

pub fn build(b: *std.Build) !void {
    const target = b.resolveTargetQuery(
        try std.Target.Query.parse(.{ .arch_os_abi = "aarch64-macos.14.0.0" }),
    );

    const optimize = b.standardOptimizeOption(.{});

    const server = b.addStaticLibrary(.{
        .name = "server",
        .root_source_file = .{ .path = "src/server/main.zig" },
        .target = target,
        .optimize = optimize,
        .strip = true,
    });

    server.bundle_compiler_rt = true;

    const sdk = std.zig.system.darwin.getSdk(b.allocator, target.result).?;

    server.addFrameworkPath(.{ .path = b.fmt("{s}/System/Library/Frameworks", .{sdk}) });
    server.addSystemIncludePath(.{ .path = b.fmt("{s}/usr/include", .{sdk}) });
    server.addIncludePath(.{ .path = "llama.cpp" });
    server.linkLibCpp();

    const shared_flags = .{
        "-DGGML_USE_ACCELERATE",
        "-DACCELERATE_NEW_LAPACK",
        "-DACCELERATE_LAPACK_ILP64",
        "-DGGML_USE_METAL",
    };

    const c_flags = .{"-std=c11"} ++ shared_flags;

    const c_source_paths: []const []const u8 = &.{
        "ggml.c",
        "ggml-alloc.c",
        "ggml-backend.c",
        "ggml-metal.m",
        "ggml-quants.c",
    };

    for (c_source_paths) |path| {
        server.addCSourceFile(.{
            .file = .{ .path = b.pathJoin(&.{ "llama.cpp", path }) },
            .flags = &c_flags,
        });
    }

    const cpp_flags = .{"-std=c++11"} ++ shared_flags;

    server.addCSourceFile(.{ .file = .{ .path = "llama.cpp/llama.cpp" }, .flags = &cpp_flags });

    // TODO: https://github.com/ggerganov/llama.cpp/issues/5376
    b.installBinFile("llama.cpp/ggml-metal.metal", "ggml-metal.metal");

    const swiftc_command = b.addSystemCommand(&.{
        "swiftc",
        "-O",
        "-lc++",
        "-framework",
        "Accelerate",
        "-import-objc-header",
        "src/server.h",
        "-target",

        b.fmt("{s}-apple-macosx{}", .{
            @tagName(target.result.cpu.arch),
            target.result.os.version_range.semver.min,
        }),
    });

    swiftc_command.addArg("-o");

    const output_file_path = swiftc_command.addOutputFileArg("app");

    swiftc_command.addArg("-Xlinker");
    swiftc_command.addFileArg(server.getEmittedBin());
    swiftc_command.addFileArg(.{ .path = "src/app.swift" });
    swiftc_command.addFileArg(.{ .path = "src/web-view.swift" });
    swiftc_command.step.dependOn(&server.step);

    b.getInstallStep().dependOn(&b.addInstallBinFile(output_file_path, "app").step);
}
