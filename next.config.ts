import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    /* config options here */
    cacheComponents: true,
    partialPrefetching: true,
    images: {
        localPatterns: [
            {
                pathname: "/img/**",
            },
        ],
        // Placeholder founder portraits. Drop this entry once real photos are in `public/`.
        remotePatterns: [
            { protocol: "https", hostname: "i.pravatar.cc" },
            { hostname: "images.unsplash.com" },
            { hostname: "cdn.example.com" },
            { hostname: "res.cloudinary.com" },
            { hostname: "api.dicebear.com" },
        ],
    },

    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
}

export default nextConfig
