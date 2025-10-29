import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function SideBar() {
    const { user, loading } = useAuth();
    return (
        <nav className="flex flex-col h-screen w-1/6 bg-white border-[E9E9E9] shadow-sm">
            <div className="flex gap-1 pl-9 pt-5">
                <img src="/pfp.png" className="w-8 h-8 mr-5"></img>
                <h1 className="text-2xl">{user.displayName}</h1>
            </div>

            <div className="pl-[87px] text-2xl mt-6">
                <ul className="list-disc list-inside marker:text-[#CCCCCC]">
                    <Link href="/">
                        <li className="mb-3.5">Home</li>
                    </Link>
                    <li className="mb-3.5">Projects</li>
                    <li className="mb-3.5">Profile</li>
                </ul>
            </div>

            <h1 className="text-2xl pl-[87px] pt-5 text-[#999999]">Dashboards</h1>

            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/overview.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Overview
                </button>
            </div>
            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/maps.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Map view
                </button>
            </div>
            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/folder.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Analysis
                </button>
            </div>

            <h1 className="text-2xl pl-[87px] pt-5 text-[#999999]">Pages</h1>

            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/account.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Account
                </button>
            </div>

            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/team.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Team
                </button>
            </div>

            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/social.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Social
                </button>
            </div>

            <div className="text-2xl pl-[60px] pt-5">
                <button className="flex items-center w-[350px] h-14 rounded-3xl border-[#999999] transition-all focus:bg-[#F5F5F5]">
                    <img src="/settings.png" className="w-6 h-6 mr-3 ml-[35px]" />
                    Settings
                </button>
            </div>

        </nav>
    )
} 
