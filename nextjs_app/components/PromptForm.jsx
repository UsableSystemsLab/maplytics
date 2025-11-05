export default function PromptForm() {
    const handleSubmit = (e) => {
        //Add logic here later
    };

    return (
        <div className="w-full">
            <div className="space-y-6">
                <label htmlFor="prompt" className="block text-lg font-semibold text-gray-900">
                    Prompt:
                </label>
                <textarea
                    id="prompt"
                    name="prompt"
                    rows="4"
                    className="w-full px-4 py-3 text-gray-700 bg-white border-2 border-cyan rounded-2xl focus:outline-none focus:border-teal-600 resize-none"
                    placeholder="Combines live or historical traffic datasets with hospital locations to assess route accessibility and emergency travel efficiency."
                />
                <div className="flex justify-center">
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-3 text-white font-medium bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                    >
                        Start Analysis
                    </button>
                </div>
            </div>
        </div>

    );
}