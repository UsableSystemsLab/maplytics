export default function Footer() {
    return (
        <footer className="w-full  py-8 mt-32 flex flex-col items-center bg-white shadow-lg">
            <p className="text-gray-600 text-lg">© 2025 Maplytics. All rights reserved.</p>
            <div className="mt-4 flex space-x-6">
                <a href="/privacy" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">Privacy Policy</a>
                <a href="/terms" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">Terms of Service</a>
                <a href="/contact" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">Contact Us</a>
            </div>
        </footer>
    )
}