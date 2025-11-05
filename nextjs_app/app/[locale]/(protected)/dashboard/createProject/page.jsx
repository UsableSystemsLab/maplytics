export default function CreateProjectPage() {
    return (

        <div>
            <h1 className="text-2xl font-bold text-heading p-2.5 m-5">Create Project</h1> { /* we need to change the heading level later */}
            <div className="h-screen w-screen flex justify-center items-start mt-5">
                <div className="bg-white h-96 w-2/3 shadow-md border border-gray-200 rounded-lg p-8">
                    <h1 className="text-2xl font-bold">Layer</h1>
                    <form className="mt-5 flex gap-10">
                        <div className="text-xl flex gap-2">
                            <label htmlFor="on">On:</label>
                            <input type="radio" id="on" name="layer" />
                        </div>
                        <div className="text-xl flex gap-2">
                            <label htmlFor="off">Off:</label>
                            <input type="radio" id="off" name="layer" />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}