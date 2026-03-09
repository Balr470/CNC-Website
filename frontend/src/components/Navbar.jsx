import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Upload, BarChart3, ShoppingBag, Heart, ShoppingCart, Menu, X, Search } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const profileRef = useRef(null);

    // Fix #3: close profile dropdown on outside click — removes the blocking full-screen overlay div
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setMobileOpen(false);
        setProfileOpen(false);
        navigate('/');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/');
        }
    };

    const isHome = location.pathname === '/';

    // Fix #7: using link.path as key instead of array index
    const navLinks = [
        { name: 'ROUTERS', path: '/category/routers' },
        { name: 'SPINDLES', path: '/category/spindles' },
        { name: 'CARVINGS', path: '/category/carvings' },
        { name: 'FURNITURE', path: '/category/furniture' },
        { name: 'RELIEFS', path: '/category/reliefs' },
        { name: 'V-BITS', path: '/category/v-bits' },
    ];

    return (
        <>
            <nav className={`sticky top-0 z-50 transition-all duration-300 ${isHome ? 'bg-white/70 backdrop-blur-xl border-b border-white/40' : 'bg-white border-b border-gray-100'} px-4 sm:px-6 lg:px-12 py-3 lg:py-4`}>
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">

                    {/* Logo */}
                    <div className="flex-1 lg:flex-none">
                        <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                            <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center text-white font-black text-xs tracking-tighter">
                                CNC
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-[#111]">CNC<span className="text-gray-400 font-medium">Market</span></span>
                        </Link>
                    </div>

                    {/* Desktop Category Links & Search */}
                    <div className="hidden lg:flex items-center justify-center flex-1 gap-6 px-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-[12px] font-bold tracking-widest transition-colors ${location.pathname === link.path ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {/* Global Search */}
                        <form onSubmit={handleSearchSubmit} className="relative hidden xl:block ml-4">
                            <input
                                type="text"
                                placeholder="Search designs, parts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-48 xl:w-64 bg-gray-50/80 hover:bg-gray-100 border border-transparent focus:border-gray-200 focus:bg-white text-sm rounded-full pl-10 pr-4 py-2 outline-none transition-all placeholder-gray-400 font-medium text-gray-700"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </form>
                    </div>

                    {/* Right Actions */}
                    <div className="flex-none flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <Link to="/cart" className="relative hidden sm:inline-flex px-3.5 py-2 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-full transition-colors items-center gap-2" title="Cart">
                                    <ShoppingCart size={18} />
                                    {user.cart && user.cart.length > 0 && (
                                        <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                            {user.cart.length}
                                        </span>
                                    )}
                                </Link>

                                <Link to="/my-wishlist" className="hidden sm:inline-flex px-3.5 py-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors items-center gap-2" title="Wishlist">
                                    <Heart size={18} />
                                </Link>

                                <Link to="/my-purchases" className="hidden sm:inline-flex px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black text-sm font-bold rounded-full transition-colors items-center gap-2">
                                    <ShoppingBag size={14} /> My Files
                                </Link>

                                {/* Profile dropdown — click-outside via useRef, no blocking overlay */}
                                <div className="relative" ref={profileRef}>
                                    <button
                                        onClick={() => setProfileOpen(!profileOpen)}
                                        className="h-10 w-10 rounded-full bg-[#111] text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <span className="text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 top-full mt-3 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                                <span className="font-bold text-gray-900 block truncate">{user.name}</span>
                                                <span className="text-xs font-medium text-gray-500 block truncate">{user.email}</span>
                                            </div>

                                            <Link to="/my-purchases" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 transition-colors sm:hidden">
                                                <ShoppingBag size={16} /> My Files
                                            </Link>
                                            <Link to="/my-wishlist" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-red-500 hover:bg-red-50 transition-colors sm:hidden">
                                                <Heart size={16} /> Wishlist
                                            </Link>

                                            {user.role === 'admin' && (
                                                <>
                                                    <Link to="/upload" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 transition-colors">
                                                        <Upload size={16} /> Upload Design
                                                    </Link>
                                                    <Link to="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 transition-colors">
                                                        <BarChart3 size={16} /> Dashboard
                                                    </Link>
                                                </>
                                            )}
                                            <div className="h-px bg-gray-100 my-1 mx-3" />
                                            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                                <LogOut size={16} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link to="/login" className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black transition-colors">Log in</Link>
                                <Link to="/register" className="px-5 py-2.5 bg-[#111] hover:bg-black text-white text-sm font-bold rounded-full transition-transform hover:scale-105 shadow-md">
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Mobile Hamburger */}
                        <button
                            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-700"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Slide-down Menu */}
            {mobileOpen && (
                <div className="lg:hidden fixed top-[65px] left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-xl px-4 py-6 overflow-y-auto max-h-[80vh]">
                    <div className="max-w-[1400px] mx-auto space-y-1">

                        {/* Mobile Global Search */}
                        <form onSubmit={(e) => { handleSearchSubmit(e); setMobileOpen(false); }} className="relative mb-6">
                            <input
                                type="text"
                                placeholder="Search designs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 focus:border-blue-500 focus:bg-white text-base rounded-2xl pl-12 pr-4 py-4 outline-none transition-all placeholder-gray-400 font-medium text-gray-700"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </form>

                        <p className="text-[11px] font-black tracking-widest text-gray-400 px-3 mb-3">CATEGORIES</p>
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="h-px bg-gray-100 my-3" />
                        <p className="text-[11px] font-black tracking-widest text-gray-400 px-3 mb-3">ACCOUNT</p>

                        {user ? (
                            <>
                                <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-500 transition-colors">
                                    <ShoppingCart size={16} /> Cart
                                    {user.cart && user.cart.length > 0 && (
                                        <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                                            {user.cart.length}
                                        </span>
                                    )}
                                </Link>
                                <Link to="/my-purchases" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                    <ShoppingBag size={16} /> My Files
                                </Link>
                                <Link to="/my-wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <Heart size={16} /> Wishlist
                                </Link>
                                {user.role === 'admin' && (
                                    <>
                                        <Link to="/upload" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                            <Upload size={16} /> Upload Design
                                        </Link>
                                        <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                            <BarChart3 size={16} /> Dashboard
                                        </Link>
                                    </>
                                )}
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1">
                                    <LogOut size={16} /> Logout
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-3 pt-2">
                                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 py-3 text-center text-sm font-bold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                                    Log In
                                </Link>
                                <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 py-3 text-center text-sm font-bold text-white bg-[#111] rounded-full hover:bg-black transition-colors">
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
