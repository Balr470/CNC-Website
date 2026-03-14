import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAllDesigns } from '../services/design.service';
import PriceTag from '../components/PriceTag';
import { PackageOpen, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import placeholderImg from '../assets/wood_part_placeholder.png';
import SEO from '../components/SEO';
import { categoryDetails } from '../content/categories';
import getDesignFormat from '../utils/getDesignFormat';

const SkeletonCard = () => (
    <div className="animate-pulse bg-white rounded-3xl p-3 flex flex-col h-full shadow-sm border border-gray-100">
        <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl mb-4"></div>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
        <div className="mt-auto flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            <div className="h-8 bg-gray-200 rounded-full w-16"></div>
        </div>
    </div>
);

const formatBadgeColor = {
    STL: 'bg-purple-100 text-purple-700',
    DXF: 'bg-blue-100 text-blue-700',
    SVG: 'bg-green-100 text-green-700'
};

const Category = () => {
    const { categoryId } = useParams();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    // BUG FIX #1: No error state — failed fetch shows empty grid with no message
    const [error, setError] = useState(null);

    const activeCategory = categoryDetails[categoryId] || categoryDetails['other'];

    useEffect(() => {
        const fetchDesigns = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getAllDesigns(`?category=${categoryId}&limit=50`);
                setDesigns(data.data.designs);
            } catch (err) {
                // BUG FIX #1 (cont.): Now shows a proper error message instead of empty grid
                setError(err.message || 'Failed to load category designs');
                toast.error(err.message || 'Failed to load category designs');
            } finally {
                setLoading(false);
            }
        };

        fetchDesigns();
    }, [categoryId]);

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <SEO
                title={`${activeCategory.title} CNC Designs`}
                description={activeCategory.desc}
            />
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16">

                <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#111] transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to Store
                </Link>

                {/* Category Header */}
                <div className="mb-16">
                    <div className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black tracking-widest mb-4">
                        CATEGORY SHOWCASE
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-black text-[#111] tracking-tight mb-4">
                        {activeCategory.title}
                    </h1>
                    <p className="text-lg text-gray-500 font-medium max-w-2xl">
                        {activeCategory.desc}{/* BUG FIX #2: designs.length shows 0 during loading — only show count once loaded */}
                        {!loading && !error && <> Browse our collection of <span className="font-bold text-gray-800">{designs.length}</span> verified files.</>}
                    </p>
                </div>

                {/* Design Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    /* BUG FIX #1 (cont.): Show error state instead of empty grid */
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
                        <PackageOpen size={64} className="mb-4 text-red-300" />
                        <p className="text-xl font-bold text-gray-800">Failed to load designs</p>
                        <p className="text-base mt-2 text-gray-500 font-medium max-w-sm text-center">{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2.5 bg-[#111] text-white rounded-full font-bold text-sm hover:bg-black transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : designs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
                        <PackageOpen size={64} className="mb-4 text-gray-300" />
                        <p className="text-xl font-bold text-gray-800">No {activeCategory.title} designs yet</p>
                        <p className="text-base mt-2 text-gray-500 font-medium">Be the first creator to upload a file to this category!</p>
                        <Link to="/" className="mt-6 px-6 py-2.5 bg-[#111] text-white rounded-full font-bold text-sm hover:bg-black transition-colors">
                            Browse All Designs
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                        {designs.map((design) => {
                            const fmt = getDesignFormat(design);
                            return (
                                <Link key={design._id} to={`/design/${design._id}`} className="group bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer">
                                    <figure className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-gray-50 mb-4 shrink-0 p-3">
                                        <img
                                            src={design.previewImages?.[0] || placeholderImg}
                                            alt={design.title}
                                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                            draggable="false"
                                            onError={(e) => { e.target.src = placeholderImg; }}
                                        />
                                        <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/50 backdrop-blur-md ${formatBadgeColor[fmt] || 'bg-white/90 text-gray-800'}`}>
                                            {fmt}
                                        </div>
                                    </figure>

                                    <div className="px-2 pb-2 flex flex-col grow justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {design.title}
                                            </h2>
                                            <p className="text-sm font-medium text-gray-400 truncate mb-3">
                                                {design.uploadedBy?.name || 'Unknown Creator'}
                                            </p>
                                        </div>

                                        {/* BUG FIX #3: Format badge was rendered TWICE per card.
                                            Once in the image overlay above, and again here below.
                                            Replaced the second badge with the price tag only. */}
                                        <div className="flex items-center justify-end mt-auto">
                                            <div className="bg-[#111] text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-sm group-hover:bg-blue-600 transition-colors flex items-center gap-1">
                                                <PriceTag price={design.price} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Category;
