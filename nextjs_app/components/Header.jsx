import { Button } from "./ui/button"

export default function Header() {
    return (
        <header className="w-full h-36 flex justify-between gap-20 py-4 px-8 bg-white shadow-md items-center">
            <img src="/logo.svg" alt="MAPLYTICS logo" className="w-52 ml-14" />
            <nav className="flex items-center gap-16 flex-1 justify-end">
                <ul className="flex gap-16 items-center">
                    <li>
                        <a href="#" className="text-4xl hover:cursor-pointer">Home</a>
                    </li>
                    <li>
                        <a href="#" className="text-4xl hover:cursor-pointer">About Us</a>
                    </li>
                    <li>
                        <a href="#" className="text-4xl hover:cursor-pointer">Contact Us</a>
                    </li>
                </ul>

                <Button size="lg" className="btn-header w-48 h-14 text-2xl font-semibold hover:cursor-pointer ml-10">
                    Sign in
                </Button>
            </nav>
        </header>
    )
}