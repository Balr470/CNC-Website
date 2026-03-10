import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllDesigns } from '../services/design.service';
import { toggleWishlist } from '../services/auth.service';
import { AuthContext } from '../context/AuthContext';
import PriceTag from '../components/PriceTag';
import { Search, PackageOpen, Star, ChevronDown, ChevronLeft, ChevronRight, X, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import heroImg from '../assets/wood_cnc_hero.png';
import DesignCard from '../components/DesignCard';

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
    const { user, refreshUser } = React.useContext(AuthContext);

    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topSelling, setTopSelling] = useState([]);
    const [latest3D, setLatest3D] = useState([]);
    const [latest2D, setLatest2D] = useState([]);
    const [togglingWishlist, setTogglingWishlist] = useState(null);
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

    // Initial load for featured sections
    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                const [topRes, d3Res, d2Res] = await Promise.all([
                    getAllDesigns('?sort=popular&limit=4'),
                    getAllDesigns('?category=3d-designs&limit=4'),
                    getAllDesigns('?category=2d-designs&limit=4')
                ]);
                setTopSelling(topRes?.data?.designs || []);
                setLatest3D(d3Res?.data?.designs || []);
                setLatest2D(d2Res?.data?.designs || []);
            } catch (e) {
                console.error('Failed to feature sections', e);
            }
        };
        fetchFeatures();
    }, []);

    const searchQuery = searchParams.get('search');

    // Re-fetch main grid when dependencies change
    useEffect(() => {
        fetchDesigns(search, sort, page, priceType, fileType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sort, page, priceType, fileType, searchQuery, fetchDesigns]);

    // Update search state if URL params change (e.g. from navbar global search)
    useEffect(() => {
        const query = searchParams.get('search') || '';
        if (query !== search) {
            setSearch(query);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleToggleWishlist = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error('Please login to save designs');
            return;
        }
        try {
            setTogglingWishlist(id);
            const res = await toggleWishlist(id);
            toast.success(res.data.isAdded ? 'Added to wishlist' : 'Removed from wishlist');
            await refreshUser();
        } catch (_error) {
            toast.error('Failed to update wishlist');
        } finally {
            setTogglingWishlist(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">

            {/* Soft background glow */}
            <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden -z-10 pointer-events-none hidden lg:block">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[80%] rounded-full bg-gradient-to-tr from-orange-100/40 via-yellow-50/40 to-transparent blur-3xl mix-blend-multiply"></div>
                <div className="absolute top-[10%] -right-[10%] w-[40%] h-[70%] rounded-full bg-gradient-to-bl from-blue-100/40 via-purple-50/40 to-transparent blur-3xl mix-blend-multiply"></div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20 overflow-hidden">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-6 mb-16 lg:mb-24">
                    <div className="flex-1 max-w-2xl z-10 w-full">
                        <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-[4rem] leading-[1.08] font-black text-[#111] tracking-tight mb-5">
                            Premium Wood CNC Designs &amp; 3D Router Reliefs
                        </h1>
                        <p className="text-lg lg:text-xl text-gray-600 font-medium mb-8">
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

                    <div className="flex-shrink-0 flex justify-center lg:justify-end relative w-full lg:w-[45%] xl:w-[48%]">
                        <div className="w-full max-w-[520px] aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-2xl shadow-gray-300/50 p-6 overflow-hidden relative group">
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
                <div className="bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-sm border border-white flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-12 max-w-4xl mx-auto lg:sticky top-24 z-30">
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

                    <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto px-2 sm:px-0">
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

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Sidebar Filters */}
                    <div className="hidden lg:block w-[280px] shrink-0 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-28">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Categories</h2>
                        <ul className="space-y-3 font-medium text-gray-600 text-sm">
                            <li><Link to="/" className="flex justify-between items-center text-blue-600 font-bold bg-blue-50 px-3 py-2 rounded-xl"><span>Show All Categories</span></Link></li>
                            <li><Link to="/category/2d-designs" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>2D Designs</span></Link></li>
                            <li><Link to="/category/2d-grill-designs" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>2D Grill Designs</span></Link></li>
                            <li><Link to="/category/3d-designs" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>3D Designs</span></Link></li>
                            <li><Link to="/category/3d-traditional" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>3D Traditional Designs</span></Link></li>
                            <li><Link to="/category/temple-designs" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>Temple Designs</span></Link></li>
                            <li><Link to="/category/other" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>Uncategorized</span></Link></li>

                            <li className="pt-2">
                                <Link to="/category/3d-doors-design" className="flex justify-between items-center hover:text-black px-3 py-2 rounded-xl hover:bg-gray-50"><span>3D Doors Design</span></Link>
                                <ul className="pl-6 mt-2 space-y-2 border-l-2 border-gray-100 ml-4">
                                    <li><Link to="/category/3d-modern-panel-doors" className="flex justify-between items-center hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-50"><span>3D Modern Panel Doors</span></Link></li>
                                    <li><Link to="/category/3d-latest-panel-door" className="flex justify-between items-center hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-50"><span>3D Latest Panel Door</span></Link></li>
                                    <li><Link to="/category/3d-borderless-mdf-door" className="flex justify-between items-center hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-50"><span>3D Borderless-MDF Door</span></Link></li>
                                    <li><Link to="/category/3d-traditional-panel-door" className="flex justify-between items-center hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-50"><span>3D Traditional Panel Door</span></Link></li>
                                    <li><Link to="/category/3d-unique-door" className="flex justify-between items-center hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-50"><span>3D Unique Door</span></Link></li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    {/* Right Side Grid */}
                    <div className="flex-1 w-full flex flex-col gap-10">
                        {/* Featured Sections (Only show if not filtering/searching) */}
                        {!loading && !search && page === 1 && sort === 'newest' && priceType === 'all' && fileType === 'all' && (
                            <>
                                {topSelling.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                <Star className="text-yellow-400 fill-yellow-400" size={24} /> Top Selling Designs
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {topSelling.map(design => <DesignCard key={design._id} design={design} user={user} onToggleWishlist={handleToggleWishlist} togglingWishlist={togglingWishlist} />)}
                                        </div>
                                    </div>
                                )}

                                {latest3D.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Latest 3D Designs</h2>
                                            <Link to="/category/3d-designs" className="text-blue-600 font-bold text-sm hover:underline">View All</Link>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {latest3D.map(design => <DesignCard key={design._id} design={design} user={user} onToggleWishlist={handleToggleWishlist} togglingWishlist={togglingWishlist} />)}
                                        </div>
                                    </div>
                                )}

                                {latest2D.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Latest 2D Designs</h2>
                                            <Link to="/category/2d-designs" className="text-blue-600 font-bold text-sm hover:underline">View All</Link>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {latest2D.map(design => <DesignCard key={design._id} design={design} user={user} onToggleWishlist={handleToggleWishlist} togglingWishlist={togglingWishlist} />)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div>
                            {/* Results count */}
                            {!loading && (
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {!search && page === 1 && sort === 'newest' && priceType === 'all' && fileType === 'all' ? 'All Designs' : 'Search Results'}
                                    </h2>
                                    <p className="text-sm font-medium text-gray-400">
                                        Showing <span className="font-bold text-gray-700">{designs.length}</span> of <span className="font-bold text-gray-700">{total}</span> designs
                                        {search && <span> for "<span className="text-blue-600">{search}</span>"</span>}
                                    </p>
                                </div>
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
                                        {designs.map(design => <DesignCard key={design._id} design={design} user={user} onToggleWishlist={handleToggleWishlist} togglingWishlist={togglingWishlist} />)}
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
                        {/* End of Right Content Div */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
