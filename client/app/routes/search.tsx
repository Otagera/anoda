import { Link } from "react-router-dom";

const searchResults = [
    { id: 1, url: "https://via.placeholder.com/300" },
    { id: 2, url: "https://via.placeholder.com/300" },
    { id: 3, url: "https://via.placeholder.com/300" },
    { id: 4, url: "https://via.placeholder.com/300" },
];

const SearchPage = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/home" className="text-blue-600 hover:underline mb-8 block">
                &larr; Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8">Search Results</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {searchResults.map((image) => (
                    <div key={image.id} className="block group">
                        <div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <img src={image.url} alt="" className="w-full h-48 object-cover" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchPage;
