import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { ShoppingBag, PackageOpen, DownloadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import placeholderImg from '../assets/wood_part_placeholder.png';
import getDesignFormat from '../utils/getDesignFormat';

// Fix #1: Use a dedicated backend endpoint that returns only purchased designs
// instead of fetching ALL designs and filtering client-side

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
    SVG: 'bg-green-100 text-green-700',
};

const MyPurchases = () => {
    const { user } = useContext(AuthContext);
    const [purchasedDesigns, setPurchasedDesigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPurchased = async () => {
            try {
                // Fix #2: always fetch from API — don't bail early based on cached IDs.
                // The IDs in AuthContext may be stale right after a new purchase,
                // so the API is always the source of truth.
                const response = await api.get('/auth/my-purchases');
                setPurchasedDesigns(response.data.data.designs || []);
            } catch (error) {
                toast.error(error.message || 'Failed to load your purchases');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchPurchased();
        } else {
            setLoading(false);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-b border-gray-200 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-green-50 rounded-2xl border border-green-100">
                            <ShoppingBag className="text-green-600" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Digital Library</h1>
                            <p className="text-gray-500 font-medium text-sm mt-1">
                                Access all your purchased CNC design files instantly.
                                {!loading && <span className="ml-2 font-bold text-gray-700">{purchasedDesigns.length} file{purchasedDesigns.length !== 1 ? 's' : ''}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : purchasedDesigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                            <PackageOpen size={40} className="text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Nothing here yet.</h2>
                        <p className="text-base text-gray-500 font-medium mt-3 mb-8 text-center max-w-sm">
                            You haven't bought any designs yet. Explore our premium marketplace to find high-quality files for your next project!
                        </p>
                        <Link to="/" className="px-8 py-3.5 bg-[#111] text-white rounded-full font-bold text-[15px] hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all">
                            Browse Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                        {purchasedDesigns.map((design) => {
                            const fmt = getDesignFormat(design);
                            return (
                                <Link key={design._id} to={`/design/${design._id}`} className="group bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer relative">

                                    <figure className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-gray-50 mb-4 shrink-0 p-3">
                                        <div className="absolute top-3 left-3 z-10 bg-green-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-md tracking-widest shadow-sm">
                                            OWNED
                                        </div>
                                        {/* Fix #5: was "Open Let's Download" — now proper label */}
                                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5 backdrop-blur-sm">
                                            <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm text-gray-900 shadow-xl flex items-center gap-2 border border-white">
                                                <DownloadCloud size={16} /> Click to Download
                                            </span>
                                        </div>
                                        <img
                                            src={design.previewImages?.[0] || placeholderImg}
                                            alt={design.title}
                                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                                            onContextMenu={(e) => e.preventDefault()}
                                            onError={(e) => { e.target.src = placeholderImg; }}
                                            draggable="false"
                                        />
                                        {/* Fix #2: correct format badge from fileKey */}
                                        <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/50 backdrop-blur-md ${formatBadgeColor[fmt] || 'bg-white/90 text-gray-800'}`}>
                                            {fmt}
                                        </div>
                                    </figure>

                                    <div className="px-2 pb-2 flex flex-col grow justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1 line-clamp-1 group-hover:text-green-600 transition-colors">
                                                {design.title}
                                            </h2>
                                            <p className="text-sm font-medium text-gray-400 truncate mb-3">
                                                By {design.uploadedBy?.name || 'Creator'}
                                            </p>
                                        </div>
                                        <div className="pl-1 pt-2 border-t border-gray-100/50 mt-auto">
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Purchased</span>
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

export default MyPurchases;
