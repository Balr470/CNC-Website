import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllDesigns } from '../services/design.service';
import PriceTag from '../components/PriceTag';
import { Search, PackageOpen, Star, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import heroImg from '../assets/wood_cnc_hero.png';
import placeholderImg from '../assets/wood_part_placeholder.png';

// File format from fileKey extension
const getFileFormat = (design) => {
    if (!design.fileKey) return 'DXF';
    const ext = design.fileKey.split('.').pop().toUpperCase();
    return ['STL', 'DXF', 'SVG'].includes(ext) ? ext : 'DXF';
};

const formatBadgeColor = { STL: 'bg-purple-100 text-purple-700', DXF: 'bg-blue-100 text-blue-700', SVG: 'bg-green-100 text-green-700' };

// Skeleton card
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

const SORT_OPTIONS = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low → High', value: 'price_asc' },
    { label: 'Price: High → Low', value: 'price_desc' },
];

const Home = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [sort, setSort] = useState('newest');
    const [priceType, setPriceType] = useState('all');
    const [fileType, setFileType] = useState('all');

    const [sortOpen, setSortOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const searchTimer = useRef(null);
    const sortRef = useRef(null);
    const filterRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setSortOpen(false);
            }
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDesigns = useCallback(async (searchVal, sortVal, pageVal, priceVal, fileVal) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchVal) params.set('search', searchVal);
            if (sortVal && sortVal !== 'newest') params.set('sort', sortVal);
            if (priceVal && priceVal !== 'all') params.set('priceType', priceVal);
            if (fileVal && fileVal !== 'all') params.set('fileType', fileVal);

            params.set('page', pageVal);
            params.set('limit', 12);

            const data = await getAllDesigns(`?${params.toString()}`);
            setDesigns(data.data.designs);
            setTotalPages(data.pages || 1);
            setTotal(data.total || data.data.designs.length);
        } catch (error) {
            toast.error(error.message || 'Failed to load designs');
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-fetch when dependencies change
    useEffect(() => {
        fetchDesigns(search, sort, page, priceType, fileType);
    }, [sort, page, priceType, fileType, searchParams.get('search'), fetchDesigns]);

    // Update search state if URL params change (e.g. from navbar global search)
    useEffect(() => {
        const query = searchParams.get('search') || '';
        if (query !== search) {
            setSearch(query);
        }
    }, [searchParams]);

    // Debounced search (local input)
    const handleSearch = (value) => {
        setSearch(value);
        setSearchParams(value ? { search: value } : {});
        setPage(1);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            fetchDesigns(value, sort, 1, priceType, fileType);
        }, 400);
    };

    const handleSort = (value) => {
        setSort(value);
        setSortOpen(false);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">

            {/* Soft background glow */}
            <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[80%] rounded-full bg-gradient-to-tr from-orange-100/40 via-yellow-50/40 to-transparent blur-3xl mix-blend-multiply"></div>
                <div className="absolute top-[10%] -right-[10%] w-[40%] h-[70%] rounded-full bg-gradient-to-bl from-blue-100/40 via-purple-50/40 to-transparent blur-3xl mix-blend-multiply"></div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 mb-16 lg:mb-24">
                    <div className="flex-1 max-w-2xl z-10">
                        <h1 className="text-5xl lg:text-[4.5rem] leading-[1.05] font-black text-[#111] tracking-tight mb-6">
                            Premium Wood CNC Designs &amp; 3D Router Reliefs
                        </h1>
                        <p className="text-xl lg:text-2xl text-gray-600 font-medium mb-10">
                            High Quality STL, DXF, and SVG Files for Woodworkers
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link to="/category/routers" className="h-10 px-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform font-bold text-xs">
                                DXF Routers
                            </Link>
                            <Link to="/category/carvings" className="h-10 px-4 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform font-bold text-xs">
                                STL Carvings
                            </Link>
                            <Link to="/category/v-bits" className="h-10 px-4 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-105 transition-transform font-bold text-xs">
                                SVG V-Bits
                            </Link>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center lg:justify-end relative w-full lg:w-auto">
                        <div className="w-full max-w-[600px] aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-2xl shadow-gray-300/50 p-8 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                            <img
                                src={heroImg}
                                alt="Wood CNC Carving"
                                className="w-full h-full object-cover rounded-2xl shadow-lg mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                        </div>
                    </div>
                </div>

                {/* Search & Sort Bar */}
                <div className="bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-sm border border-white flex flex-col sm:flex-row items-center gap-2 mb-12 max-w-4xl mx-auto sticky top-24 z-30">
                    <div className="flex-1 flex items-center bg-gray-50/50 rounded-full px-4 py-3 sm:py-2 w-full">
                        <Search className="text-gray-400 mr-3 shrink-0" size={20} />
                        <input
                            type="text"
                            placeholder="Search rosettes, panels, furniture plans..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-base font-medium text-gray-700 placeholder-gray-400"
                        />
                        {search && (
                            <button onClick={() => handleSearch('')} className="text-gray-400 hover:text-black ml-2 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto px-2 sm:px-0">
                        <div className="h-8 w-[1px] bg-gray-200 hidden sm:block mx-2"></div>

                        {/* Filters Dropdown */}
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors whitespace-nowrap text-sm font-semibold shadow-sm"
                            >
                                Filters {(priceType !== 'all' || fileType !== 'all') && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {filterOpen && (
                                <div className="absolute right-0 sm:left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-400 mb-2 tracking-widest">PRICE</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['all', 'free', 'premium'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => { setPriceType(type); setPage(1); }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${priceType === type ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 tracking-widest">FILE FORMAT</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['all', 'dxf', 'stl', 'svg'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => { setFileType(type); setPage(1); }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${fileType === type ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    {type.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative" ref={sortRef}>
                            <button
                                onClick={() => setSortOpen(!sortOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#111] text-white hover:bg-black transition-colors whitespace-nowrap text-sm font-semibold shadow-md"
                            >
                                {SORT_OPTIONS.find(o => o.value === sort)?.label || 'Sort by'}
                                <ChevronDown size={14} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {sortOpen && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                    {SORT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSort(opt.value)}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors ${sort === opt.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results count */}
                {!loading && (
                    <p className="text-sm font-medium text-gray-400 mb-6">
                        Showing <span className="font-bold text-gray-700">{designs.length}</span> of <span className="font-bold text-gray-700">{total}</span> designs
                        {search && <span> for "<span className="text-blue-600">{search}</span>"</span>}
                    </p>
                )}

                {/* Design Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : designs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
                        <PackageOpen size={64} className="mb-4 text-gray-300" />
                        <p className="text-xl font-bold text-gray-800">
                            {search ? `No results for "${search}"` : 'No designs available yet'}
                        </p>
                        <p className="text-base mt-2 text-gray-500 font-medium">
                            {search ? 'Try a different search term' : 'Check back soon!'}
                        </p>
                        {search && (
                            <button onClick={() => handleSearch('')} className="mt-6 px-6 py-2.5 bg-[#111] text-white rounded-full font-bold text-sm hover:bg-black transition-colors">
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                            {designs.map((design) => {
                                const fmt = getFileFormat(design);
                                return (
                                    <Link key={design._id} to={`/design/${design._id}`} className="group bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer">
                                        <figure className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-gray-50 mb-4 shrink-0">
                                            <img
                                                src={design.previewImages?.[0] || placeholderImg}
                                                alt={design.title}
                                                className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                                draggable="false"
                                                onError={(e) => { e.target.src = placeholderImg; }}
                                            />
                                            {/* Correct format badge from fileKey extension */}
                                            <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white backdrop-blur-md ${formatBadgeColor[fmt] || 'bg-white/90 text-gray-800'}`}>
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

                                            <div className="flex items-center justify-between mt-auto">
                                                {/* Fix #8: avgRating not computed per-design in listing — show price badge only */}
                                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full capitalize">
                                                    {design.category || 'CNC'}
                                                </span>

                                                <div className="bg-[#111] text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-sm group-hover:bg-blue-600 transition-colors flex items-center gap-1">
                                                    <PriceTag price={design.price} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Fix #4: Smart paginator with ellipsis — avoids rendering 50+ buttons */}
                        {totalPages > 1 && (() => {
                            const buildPages = () => {
                                const pages = [];
                                const delta = 1; // pages around current
                                for (let i = 1; i <= totalPages; i++) {
                                    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                                        pages.push(i);
                                    } else if (pages[pages.length - 1] !== '...') {
                                        pages.push('...');
                                    }
                                }
                                return pages;
                            };
                            return (
                                <div className="flex items-center justify-center gap-2 mt-16">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>

                                    {buildPages().map((p, i) =>
                                        p === '...' ? (
                                            <span key={`ellipsis-${i}`} className="w-10 text-center text-gray-400 font-bold">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${page === p ? 'bg-[#111] text-white shadow-md scale-110' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}

                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
    );
};

export default Home;
