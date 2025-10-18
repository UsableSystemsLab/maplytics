import { Button } from "./ui/button"

export default function Header() {
    return (
        <header className="w-full flex items-center justify-center gap-20 py-4 px-8 bg-white">
            <img src="/logo.svg" className="w-44" />
            <h1 className="text-2xl hover: cursor-pointer">Home</h1>
            <h1 className="text-2xl hover: cursor-pointer">About Us</h1>
            <h1 className="text-2xl hover: cursor-pointer">Contact Us</h1>
            <Button size="lg" className={"text-base hover: cursor-pointer"}>Sign in</Button>
        </header>
    )
}