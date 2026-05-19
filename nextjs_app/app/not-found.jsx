import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>Page Not Found - Maplytics</title>
      </head>
      <body className="">
        <div className="text-center p-8 max-w-md w-full m-auto mt-10 self-center">
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-[#134565]/40 rounded-full flex items-center justify-center border border-[#A7B34F]/40 shadow-[0_0_15px_rgba(167,179,79,0.2)]">
              <span className="text-5xl font-bold">404</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">Lost Your Way?</h1>
          <p className="mb-8 text-base">
            The destination you're looking for doesn't exist on our map. Let's get you back on track.
          </p>

          <Link href="/"
            className="inline-block bg-[#134565] hover:bg-[#1c5d8a] text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-300 border border-transparent hover:border-[#A7B34F]/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Return to Home
          </Link>

        </div>
      </body>
    </html>
  );
}
