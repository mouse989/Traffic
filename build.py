#!/usr/bin/env python3
"""
Build script: packages backend + frontend into a single executable.

Usage:
  python build.py              # Full build (frontend + backend)
  python build.py --backend    # Backend only (skip frontend build)
  python build.py --frontend   # Frontend only
"""
import subprocess
import shutil
import os
import sys
import argparse


def run(cmd, cwd=None):
    print(f"  $ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), check=True)
    return result


def build_frontend():
    print("\n[1/3] Building React frontend...")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    run(["npm", "install"], cwd=frontend_dir)
    run(["npm", "run", "build"], cwd=frontend_dir)
    print("  Frontend built successfully.")


def copy_static():
    print("\n[2/3] Copying static files into backend...")
    src = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    dst = os.path.join(os.path.dirname(__file__), "backend", "app", "static")
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print(f"  Copied {src} → {dst}")


def build_backend():
    print("\n[3/3] Building backend with PyInstaller...")
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    run(["pyinstaller", "--clean", "traffic.spec"], cwd=backend_dir)

    platform = sys.platform
    ext = ".exe" if platform == "win32" else ""
    output = os.path.join(backend_dir, "dist", f"traffic{ext}")

    if os.path.exists(output):
        size_mb = os.path.getsize(output) / (1024 * 1024)
        print(f"\n  Build successful!")
        print(f"  Output: {output} ({size_mb:.1f} MB)")
        print(f"\n  To run: cd backend/dist && ./traffic{ext}")
        print(f"  Don't forget to create a .env file in the same directory!")
    else:
        print(f"  ERROR: Expected output not found at {output}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Traffic build script")
    parser.add_argument("--backend", action="store_true", help="Build backend only")
    parser.add_argument("--frontend", action="store_true", help="Build frontend only")
    args = parser.parse_args()

    if args.frontend:
        build_frontend()
        return

    if args.backend:
        build_backend()
        return

    # Full build
    build_frontend()
    copy_static()
    build_backend()


if __name__ == "__main__":
    main()
