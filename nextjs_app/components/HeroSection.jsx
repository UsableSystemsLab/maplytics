import { Button } from "./ui/button"
import Link from "next/link";

export default function HeroSection() {
    return (
        <section className={"ml-96 mr-56 mb-32 mt-32 max-w-full relative"}>
            <div className="content relative z-10 max-w-4xl">
                <h1 className={"text-7xl font-bold w-5xl leading-snug text-[#333333]"}>Transform <span className={"text-[#A7B34F]"}>Geospatial</span> Data Into Actionable Insights</h1>
                <p className={"text-2xl mt-8 text-[#5C5C5C] font-bold max-w-[840px]"}>Unlock the power of spatial analysis to <span className={"text-[#2C3580]"}>visualize patterns,</span> <span className={"text-[#A7B34F]"}>make smarter</span> <span className={"text-[#2C3580]"}>data-informed decisions</span> — All in one simple intuitive platform!</p>
                <div className="buttons mt-8 flex flex-col gap-4 max-w-lg">
                    <Link href="/dashboard">
                        <Button className={"bg-[#134565] text-white text-[31px] font-semibold px-6 py-3 rounded-md w-[525px] h-20 hover:bg-[#134565]"}>Start Analysis</Button>
                    </Link>
                    <Button className={"bg-[#0E3147] text-white text-[31px]  font-bold px-6 py-3 rounded-md w-[525px] h-20 hover:bg-[#0E3147]"}>Learn More</Button>
                </div>
            </div>
            <div className="image absolute -right-120 top-96 -translate-y-1/2 translate-x-1/4 z-0">
                <img src="/Earth.png" alt="Earth image" className={"w-[1000px] h-auto animate-[spin_60s_linear_infinite]"} />
            </div>
        </section>
    )
}