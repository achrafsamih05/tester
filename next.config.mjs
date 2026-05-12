/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Supabase Storage public bucket URLs live under `*.supabase.co`.
      // Project URLs look like https://<ref>.supabase.co/storage/v1/object/public/product-images/...
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
