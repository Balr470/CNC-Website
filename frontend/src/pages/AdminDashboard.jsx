import React, { useState, useEffect, useCallback } from 'react';
import { getAdminStats, getAdminUsers } from '../services/admin.service';
import { Users, FileBox, IndianRupee, Database, Image as ImageIcon, Cloud, BarChart3, AlertTriangle, Search, ChevronLeft, ChevronRight, ShieldCheck, Shield, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subValue, icon: Icon, color, isWarning }) => {
    const iconColors = {
        blue: "text-blue-500 bg-blue-50 border-blue-100",
        purple: "text-purple-500 bg-purple-50 border-purple-100",
        green: "text-green-500 bg-green-50 border-green-100",
        orange: "text-orange-500 bg-orange-50 border-orange-100",
        red: "text-red-500 bg-red-50 border-red-100",
        gray: "text-gray-500 bg-gray-50 border-gray-100"
    };
    const activeColorStr = isWarning ? iconColors['red'] : iconColors[color] || iconColors['gray'];

    return (
        <div className={`bg-white rounded-[2rem] p-6 shadow-sm border ${isWarning ? 'border-red-200 shadow-red-500/5' : 'border-gray-100'} relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className={`absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${isWarning ? 'text-red-500' : 'text-gray-900'}`}>
                <Icon size={120} />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${activeColorStr}`}>
                    <Icon size={20} />
                </div>
                <h3 className="text-[15px] font-bold text-gray-500">{title}</h3>
            </div>
            <div className="relative z-10">
                <span className={`text-4xl font-black ${isWarning ? 'text-red-600' : 'text-gray-900'} tracking-tight`}>{value}</span>
                {subValue && <p className="text-sm text-gray-400 mt-3 font-medium border-t border-gray-50 pt-3">{subValue}</p>}
            </div>
        </div>
    );
};

// ─── User Management Section ──────────────────────────────────────────────────
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Draft filter values (inside the panel)
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Committed (applied) filters — what the API actually uses
    const [applied, setApplied] = useState({
        search: '', role: '', sortBy: 'newest', dateFrom: '', dateTo: ''
    });

    // BUG FIX #1: fetchUsers was re-created on every render because the
    // useCallback had no deps but closed over nothing. It's correct as-is, but
    // we must NOT include `applied` or `page` in deps here — those are passed
    // as arguments. This is intentional and correct.
    const fetchUsers = useCallback(async (p, filters) => {
        setLoading(true);
        try {
            const data = await getAdminUsers({ page: p, ...filters });
            setUsers(data.users || []);
            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(page, applied);
    }, [page, applied, fetchUsers]);

    const applyFilters = () => {
        // BUG FIX #2: dateFrom > dateTo was never validated — API gets invalid
        // range and MongoDB returns 0 results with no error shown to admin.
        if (dateFrom && dateTo && dateFrom > dateTo) {
            toast.error('"Joined From" date cannot be after "Joined Until" date');
            return;
        }
        const next = { search, role, sortBy, dateFrom, dateTo };
        setApplied(next);
        setPage(1);
        setFiltersOpen(false);
    };

    const resetFilters = () => {
        setSearch(''); setRole('');
        setSortBy('newest'); setDateFrom(''); setDateTo('');
        const cleared = { search: '', role: '', sortBy: 'newest', dateFrom: '', dateTo: '' };
        setApplied(cleared);
        setPage(1);
    };

    const removeFilter = (key, defaultVal = '') => {
        const updates = { [key]: defaultVal };
        if (key === 'search') setSearch('');
        if (key === 'role') setRole('');
        if (key === 'sortBy') { setSortBy('newest'); updates.sortBy = 'newest'; }
        if (key === 'dateFrom') setDateFrom('');
        if (key === 'dateTo') setDateTo('');
        setApplied(a => ({ ...a, ...updates }));
        setPage(1);
    };


    const activeFiltersCount = [applied.search, applied.role, applied.dateFrom, applied.dateTo].filter(Boolean).length
        + (applied.sortBy !== 'newest' ? 1 : 0);

    return (
        <div className="mt-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users size={14} className="text-blue-600" />
                    </span>
                    User Management
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{total}</span>
                </h2>
                <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                        <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 bg-red-50 px-3 py-2 rounded-xl transition-colors">
                            <X size={12} /> Clear All ({activeFiltersCount})
                        </button>
                    )}
                    <button
                        onClick={() => setFiltersOpen(o => !o)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${filtersOpen ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                        <Filter size={14} />
                        Advanced Search
                        {activeFiltersCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">{activeFiltersCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Advanced Filter Panel */}
            {filtersOpen && (
                <div className="bg-white rounded-[1.5rem] border border-gray-200 shadow-sm p-6 mb-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">SEARCH</label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 gap-2">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Name or email..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && applyFilters()}
                                    className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder-gray-400 w-full"
                                />
                                {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-400 hover:text-black" /></button>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">ROLE</label>
                            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500">
                                <option value="">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">SORT BY</label>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="purchases">Most Purchases</option>
                                <option value="name_asc">Name A → Z</option>
                                <option value="name_desc">Name Z → A</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">JOINED FROM</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider">JOINED UNTIL</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                        <button onClick={resetFilters} className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">Reset</button>
                        <button onClick={applyFilters} className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition-colors flex items-center gap-2">
                            <Search size={14} /> Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {applied.search && <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-3 py-1.5 rounded-full">Search: "{applied.search}" <button onClick={() => removeFilter('search')}><X size={10} /></button></span>}
                    {applied.role && <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold px-3 py-1.5 rounded-full">Role: {applied.role} <button onClick={() => removeFilter('role')}><X size={10} /></button></span>}
                    {applied.sortBy !== 'newest' && <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-full">Sort: {applied.sortBy} <button onClick={() => removeFilter('sortBy', 'newest')}><X size={10} /></button></span>}
                    {applied.dateFrom && <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold px-3 py-1.5 rounded-full">From: {applied.dateFrom} <button onClick={() => removeFilter('dateFrom')}><X size={10} /></button></span>}
                    {applied.dateTo && <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold px-3 py-1.5 rounded-full">Until: {applied.dateTo} <button onClick={() => removeFilter('dateTo')}><X size={10} /></button></span>}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="text-left px-6 py-4 font-bold text-gray-500 text-xs tracking-wider">USER</th>
                                <th className="text-left px-6 py-4 font-bold text-gray-500 text-xs tracking-wider">EMAIL</th>
                                <th className="text-left px-6 py-4 font-bold text-gray-500 text-xs tracking-wider">ROLE</th>
                                <th className="text-left px-6 py-4 font-bold text-gray-500 text-xs tracking-wider">PURCHASES</th>
                                <th className="text-left px-6 py-4 font-bold text-gray-500 text-xs tracking-wider">JOINED</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-gray-400 font-medium">
                                        No users match your filters
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-900 truncate max-w-[140px]">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.role === 'admin' ? <ShieldCheck size={11} /> : <Shield size={11} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-700">{user.purchasedDesigns?.length || 0}</td>
                                        <td className="px-6 py-4 text-gray-400 font-medium text-xs">
                                            {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/40">
                        <p className="text-sm font-medium text-gray-400">
                            Page <span className="font-bold text-gray-700">{page}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    // BUG FIX #5: No error state — if fetch fails, loading becomes false but
    // stats stays null and the component shows a generic "No metrics" message
    // with no indication of WHY it failed. Added dedicated error state.
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getAdminStats();
                setStats(data.data);
            } catch (err) {
                const msg = err.response?.data?.error || err.message || 'Failed to load admin metrics';
                setError(msg);
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-[#f8f9fc]">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            </div>
        );
    }

    // BUG FIX #5 (cont.): Show the actual error instead of a vague message
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
                <AlertTriangle size={32} className="text-red-400" />
                <p className="font-bold text-gray-700">Failed to load dashboard</p>
                <p className="text-sm text-gray-400 max-w-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="px-5 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    if (!stats) return null;

    const { counts, revenue, storage } = stats;

    // BUG FIX #6: revenue could be undefined if the aggregate returns nothing
    // (e.g. no successful orders yet). toLocaleString() on undefined throws.
    const safeRevenue = revenue ?? 0;

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">

                {/* Header */}
                <div className="flex items-center gap-4 mb-10 border-b border-gray-200 pb-8">
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
                        <BarChart3 className="text-blue-600" size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Analytics</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1">Live operational metrics and storage tracking</p>
                    </div>
                </div>

                {/* General App Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 mb-12">
                    <StatCard title="Total Users" value={counts.users} icon={Users} color="blue" />
                    <StatCard title="Total Designs" value={counts.designs} icon={FileBox} color="purple" />
                    <StatCard
                        title="Gross Revenue"
                        value={`₹${safeRevenue.toLocaleString()}`}
                        icon={IndianRupee}
                        color="green"
                    />
                </div>

                {/* Infrastructure Tracker */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><Database size={14} className="text-gray-600" /></span>
                        Infrastructure Limits Tracker
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 mb-10">
                        <StatCard
                            title="MongoDB Atlas (Free M0)"
                            value={`${storage.mongodb.dataSize} MB`}
                            subValue={`Limit: ${storage.mongodb.totalLimit || 512} MB • Storage used: ${storage.mongodb.storageSize} MB`}
                            icon={Database}
                            color="green"
                        />
                        <StatCard
                            title="Cloudinary Previews"
                            value={storage.cloudinary.status === 'Active' ? `${storage.cloudinary.storage} MB` : 'Offline'}
                            subValue={storage.cloudinary.status === 'Active' ? `Bandwidth: ${storage.cloudinary.bandwidth} MB • Plan: ${storage.cloudinary.plan}` : storage.cloudinary.error || 'API details missing.'}
                            icon={ImageIcon}
                            color="purple"
                            isWarning={storage.cloudinary.status !== 'Active'}
                        />
                        <StatCard
                            title="Cloudflare R2 Bucket"
                            value={storage.r2.status === 'Active' ? `${storage.r2.totalSize} MB` : 'Offline'}
                            subValue={storage.r2.status === 'Active' ? `Total Secured CNC Files: ${storage.r2.totalFiles} (Limit: 10GB/mo free)` : storage.r2.error || 'Bucket details missing.'}
                            icon={Cloud}
                            color="orange"
                            isWarning={storage.r2.status !== 'Active'}
                        />
                    </div>
                </div>

                {/* Admin Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-6 sm:p-8 flex items-start gap-4 shadow-sm">
                    <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 mb-1">Admin Infrastructure Note</h3>
                        <div className="text-sm font-medium text-amber-800/80 leading-relaxed max-w-4xl">
                            The MongoDB Atlas Free cluster (M0) limits data to 512MB and implements heavy connection throttles. Cloudflare R2 provides up to 10GB of egress free monthly. Monitor usage closely as the CNC market scales to anticipate service billing.
                        </div>
                    </div>
                </div>

                {/* ── User Management ── */}
                <UserManagement />

            </div>
        </div>
    );
};

export default AdminDashboard;
