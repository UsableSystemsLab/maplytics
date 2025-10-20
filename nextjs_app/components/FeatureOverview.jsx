import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.jsx"
export default function FeatureOverview() {
    return (
        <section className="ml-96 mr-56  mb-32 mt-80 border-t-2 pt-16 border-gray-200">
            <h2 className="text-5xl font-bold mb-12 text-[#333334]">Feature Overview</h2>
            <div className="cards flex flex-wrap gap-8">
                <Card className="min-h-96 max-w-96 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <CardHeader className={"text-4xl flex justify-center mt-4"}>
                        <CardTitle className={"font-bold"}>Add <span className="text-[#2C3580]">Datasets</span></CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-[#5C5C5C] text-2xl text-center">You can add your own datasets to adjust the output depending on the data you add!</p>
                    </CardContent>
                </Card>
                <Card className="min-h-96 max-w-96 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <CardHeader className={"text-4xl flex justify-center mt-4"}>
                        <CardTitle className={"font-bold "}>Create <span className="text-[#A7B34F]">Graphs</span></CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-[#5C5C5C] text-2xl text-center">You can create any type of supported graphs for statistical analysis!</p>
                    </CardContent>
                </Card>
                <Card className="min-h-96 max-w-96 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <CardHeader className={"text-4xl flex justify-center mt-4 text-center"}>
                        <CardTitle className={"font-bold"}>Invite <span className="text-[#2C3580]">Team</span>  Members</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-[#5C5C5C] text-2xl text-center">You can add your team members to view your graphs and queries to plan together!</p>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}