import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDesignById, getDownloadLink, deleteDesign, updateDesign, getRelatedDesigns } from '../services/design.service';
import { createOrder } from '../services/payment.service';
import { getDesignReviews, createReview } from '../services/review.service';
import { AuthContext } from '../context/AuthContext';
import { toggleWishlist, toggleCart } from '../services/auth.service';
import PriceTag from '../components/PriceTag';
import { Download, ShieldCheck, Clock, DownloadCloud, Trash2, CheckCircle2, Star, Share2, Heart, MessageSquare, ShoppingCart, Edit3, X } from 'lucide-react';
import toast from 'react-hot-toast';
import NotFound from './NotFound';
import SEO from '../components/SEO';
import placeholderImg from '../assets/wood_part_placeholder.png';

// Derive format label from fileKey extension
const getFileFormat = (design) => {
    if (!design?.fileKey) return null;
    const ext = design.fileKey.split('.').pop().toUpperCase();
    return ['STL', 'DXF', 'SVG'].includes(ext) ? ext : null;
};

const formatBadgeStyle = {
    STL: 'bg-purple-50 text-purple-600 border-purple-100',
    DXF: 'bg-blue-50 text-blue-600 border-blue-100',
    SVG: 'bg-green-50 text-green-600 border-green-100',
};

const DesignDetails = () => {
    const { id } = useParams();
    const { user, refreshUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [design, setDesign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [liked, setLiked] = useState(false);
    const [togglingWishlist, setTogglingWishlist] = useState(false);

    // Cart state
    const [inCart, setInCart] = useState(false);
    const [togglingCart, setTogglingCart] = useState(false);

    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [myRating, setMyRating] = useState(5);
    const [myComment, setMyComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Related designs
    const [relatedDesigns, setRelatedDesigns] = useState([]);

    // Edit state (Admin)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', price: 0, category: '' });
    const [updatingDesign, setUpdatingDesign] = useState(false);

    useEffect(() => {
        const fetchDesign = async () => {
            try {
                const [designRes, reviewsRes, relatedRes] = await Promise.all([
                    getDesignById(id),
                    getDesignReviews(id),
                    getRelatedDesigns(id).catch(() => ({ data: { designs: [] } }))
                ]);
                setDesign(designRes.data.design);
                setReviews(reviewsRes.data.reviews || []);
                setAvgRating(reviewsRes.data.avgRating || 0);
                setRelatedDesigns(relatedRes.data?.designs || []);
            } catch (error) {
                toast.error('Failed to load design or reviews');
            } finally {
                setLoading(false);
            }
        };
        fetchDesign();
    }, [id]);

    useEffect(() => {
        if (user && design) {
            const isLiked = (user.wishlist || []).some(wId => wId.toString() === design._id.toString());
            setLiked(isLiked);

            const isCart = (user.cart || []).some(cId => cId.toString() === design._id.toString());
            setInCart(isCart);
        }
    }, [user, design]);

    const handleToggleWishlist = async () => {
        if (!user) {
            toast.error('Please login to save designs to your wishlist');
            navigate('/login');
            return;
        }

        try {
            setTogglingWishlist(true);
            const data = await toggleWishlist(id);
            setLiked(data.data.isAdded);
            if (data.data.isAdded) {
                toast.success('Added to wishlist');
            } else {
                toast.success('Removed from wishlist');
            }
            // Refresh user so that AuthContext is up to date
            await refreshUser();
        } catch (error) {
            toast.error(error.message || 'Failed to update wishlist');
        } finally {
            setTogglingWishlist(false);
        }
    };

    const handleDownloadFree = async () => {
        if (!user) {
            toast.error('Please login to download free designs');
            navigate('/login');
            return;
        }

        try {
            setProcessing(true);
            const data = await getDownloadLink(id);

            // Auto-download using signed URL
            const link = document.createElement('a');
            link.href = data.data.downloadUrl;
            link.target = '_blank';
            link.download = design.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Download started! Link valid for 5 minutes.'); // Fix #1: was "60 seconds"
        } catch (error) {
            toast.error(error.message || 'Download failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            setSubmittingReview(true);
            await createReview(id, myRating, myComment);
            toast.success('Review added successfully!');
            setMyComment('');

            // Reload reviews
            const reviewsRes = await getDesignReviews(id);
            setReviews(reviewsRes.data.reviews || []);
            setAvgRating(reviewsRes.data.avgRating || 0);
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleToggleCart = async () => {
        if (!user) {
            toast.error('Please login to add designs to cart');
            navigate('/login');
            return;
        }

        try {
            setTogglingCart(true);
            const data = await toggleCart(id);
            setInCart(data.data.isAdded);
            if (data.data.isAdded) {
                toast.success('Added to Cart!');
            } else {
                toast.success('Removed from Cart');
            }
            await refreshUser();
        } catch (error) {
            toast.error(error.message || 'Failed to update cart');
        } finally {
            setTogglingCart(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this design? Users who purchased it will still have access, but it will be removed from the store.')) {
            return;
        }

        try {
            setProcessing(true);
            await deleteDesign(id);
            toast.success('Design deleted successfully');
            navigate('/');
        } catch (error) {
            toast.error(error.message || 'Failed to delete design');
            setProcessing(false);
        }
    };

    const handleEditOpen = () => {
        setEditForm({
            title: design.title,
            description: design.description,
            price: design.price,
            category: design.category,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setUpdatingDesign(true);
            const res = await updateDesign(id, editForm);
            setDesign(res.data.design);
            toast.success('Design updated successfully!');
            setIsEditModalOpen(false);
        } catch (error) {
            toast.error(error.message || 'Failed to update design');
        } finally {
            setUpdatingDesign(false);
        }
    };

    const handleCheckout = async () => {
        if (!user) {
            toast.error('Please login to purchase designs');
            navigate('/login');
            return;
        }

        try {
            setProcessing(true);

            // Pass design ID inside an array to conform to multi-item cart standard
            const orderData = await createOrder([id]);

            if (orderData.sessionUrl) {
                // Redirect user to Stripe Checkout
                window.location.href = orderData.sessionUrl;
            } else {
                toast.error('Failed to initialize checkout session');
                setProcessing(false);
            }

        } catch (error) {
            toast.error(error.message || 'Failed to initialize checkout');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fc] flex justify-center items-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!design) return <NotFound />;

    const hasPurchased = (user?.purchasedDesigns || []).some(
        (pid) => pid.toString() === design._id.toString()  // Fix #3: renamed to avoid shadowing outer `id`
    );
    const isOwner = user?._id?.toString() === design.uploadedBy?._id?.toString();
    const hasSubscriptionCredits = user?.subscriptionStatus === 'active' && user?.downloadsRemaining > 0;
    const fmt = getFileFormat(design);

    return (
        <div className="min-h-screen bg-[#f8f9fc] pt-8 pb-24 font-sans selection:bg-black selection:text-white">
            <SEO
                title={design.title}
                description={design.description}
                image={design.previewImages?.[0] || 'https://cnc-designs.com/og-image.jpg'}
                type="article"
            />
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">

                {/* Breadcrumbs — Fix #13: use proper Link elements */}
                <div className="text-sm font-medium text-gray-400 mb-8 flex items-center gap-2">
                    <Link to="/" className="hover:text-black transition-colors">Home</Link>
                    <span>/</span>
                    <Link to="/" className="hover:text-black transition-colors">Designs</Link> {/* Fix #3: was "/?" */}
                    <span>/</span>
                    <span className="text-gray-900 truncate max-w-[200px]">{design.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14">

                    {/* Left: Image Preview */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <div className="bg-white rounded-[2rem] w-full aspect-[4/3] p-4 sm:p-8 flex justify-center items-center shadow-sm border border-gray-100 relative group overflow-hidden">

                            {/* Tags — derived from actual fileKey extension (#4 fix) */}
                            <div className="absolute top-6 left-6 flex gap-2 z-10">
                                {fmt && (
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border tracking-wider ${formatBadgeStyle[fmt]}`}>
                                        {fmt}
                                    </span>
                                )}
                            </div>

                            {/* Fix #8: Like button connected to backed wishlist state */}
                            <button
                                onClick={handleToggleWishlist}
                                disabled={togglingWishlist}
                                className={`absolute top-6 right-6 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center hover:scale-110 transition-all z-10 border disabled:opacity-50 disabled:cursor-wait ${liked ? 'text-red-500 border-red-100 bg-red-50' : 'text-gray-400 border-gray-100 hover:text-red-500'
                                    }`}
                                title={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                            </button>

                            <img
                                src={design.previewImages?.[0] || placeholderImg}
                                alt={design.title}
                                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-700 select-none z-0"
                                onError={(e) => { e.target.src = placeholderImg; }}
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                            />
                        </div>

                        {/* Smaller thumbnails below */}
                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-black p-2 flex-shrink-0 cursor-pointer shadow-sm">
                                <img
                                    src={design.previewImages?.[0] || placeholderImg}
                                    className="w-full h-full object-cover mix-blend-multiply rounded-xl"
                                    alt="thumb 1"
                                />
                            </div>
                            <div className="w-24 h-24 rounded-2xl bg-white border border-gray-100 p-2 flex-shrink-0 cursor-pointer hover:border-black/30 transition-colors shadow-sm opacity-60 hover:opacity-100">
                                <div className="w-full h-full rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-xs font-bold">More</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info + Action */}
                    <div className="lg:col-span-5 flex flex-col">
                        <div className="bg-white rounded-[2.5rem] p-8 xl:p-10 shadow-sm border border-gray-100 flex flex-col sticky top-28">

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-1.5 text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill={i < Math.round(Number(avgRating)) ? "currentColor" : "none"} className={i < Math.round(Number(avgRating)) ? "" : "text-gray-300"} />
                                    ))}
                                    <span className="text-sm font-bold text-gray-500 ml-1.5">({avgRating > 0 ? avgRating : 'New'})</span>
                                </div>
                                <button className="text-gray-400 hover:text-black flex items-center gap-1.5 text-sm font-semibold transition-colors">
                                    <Share2 size={16} /> Share
                                </button>
                            </div>

                            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-[1.15]">
                                {design.title}
                            </h1>

                            <p className="text-gray-500 font-medium text-base mb-6 flex items-center gap-2 pb-6 border-b border-gray-100">
                                By <span className="font-bold text-black border-b border-black/20 pb-0.5">{design.uploadedBy?.name || 'Creator'}</span>
                            </p>

                            <div className="text-gray-600 font-medium text-[15px] leading-relaxed mb-8 grow">
                                {design.description || "Premium vector graphics and 3D reliefs perfectly generated and tested for wood CNC routing, carving, and laser engraving machines. Guaranteed clean toolpaths and smooth finishes."}
                            </div>

                            {/* Specifications List */}
                            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100/50">
                                <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-blue-500" /> Specifications
                                </h3>
                                <ul className="text-sm space-y-3 font-medium">
                                    <li className="flex justify-between items-center text-gray-500"><span className="flex items-center gap-2">File Format</span><span className="font-bold text-gray-900 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{fmt || 'CNC File'}</span></li> {/* Fix #6: was hardcoded "ZIP Archive" */}
                                    <li className="flex justify-between items-center text-gray-500"><span className="flex items-center gap-2">Compatibility</span><span className="font-bold text-gray-900 text-right">Mach3, GRBL, VCarve</span></li>
                                    <li className="flex justify-between items-center text-gray-500"><span className="flex items-center gap-2">Vectors</span><span className="font-bold text-gray-900 flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> Closed paths</span></li>
                                </ul>
                            </div>

                            {user?.role === 'admin' && (
                                <div className="flex gap-3 w-full mb-6">
                                    <button
                                        onClick={handleEditOpen}
                                        disabled={processing}
                                        className="flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
                                    >
                                        <Edit3 size={18} /> Edit
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={processing}
                                        className="flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                                    >
                                        <Trash2 size={18} /> Delete
                                    </button>
                                </div>
                            )}

                            <div>
                                {design.price === 0 ? (
                                    <button
                                        onClick={handleDownloadFree}
                                        disabled={processing}
                                        className="w-full flex items-center justify-between px-6 py-4 rounded-full font-bold text-lg cursor-pointer transition-all bg-[#111] text-white hover:bg-black hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <DownloadCloud size={24} />}
                                            <span>Download Free</span>
                                        </div>
                                        <span className="opacity-50 text-sm">Free</span>
                                    </button>
                                ) : hasPurchased || isOwner ? (
                                    <button
                                        onClick={handleDownloadFree}
                                        disabled={processing}
                                        className="w-full flex items-center justify-between px-6 py-4 rounded-full font-bold text-lg cursor-pointer transition-all bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Download size={24} />}
                                            <span>Download File</span>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider">READY</span>
                                    </button>
                                ) : hasSubscriptionCredits ? (
                                    <button
                                        onClick={handleDownloadFree}
                                        disabled={processing}
                                        className="w-full flex items-center justify-between px-6 py-4 rounded-full font-bold text-lg cursor-pointer transition-all bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed mb-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Download size={24} />}
                                            <span>Download</span>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider">USES 1 CREDIT</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleToggleCart}
                                            disabled={togglingCart || processing}
                                            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-lg cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed ${inCart ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200' : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-200 hover:border-black'
                                                }`}
                                        >
                                            {togglingCart ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : <ShoppingCart size={20} className={inCart ? "fill-gray-900" : ""} />}
                                            {inCart ? 'Remove from Cart' : 'Add to Cart'}
                                        </button>

                                        <button
                                            onClick={handleCheckout}
                                            disabled={processing}
                                            className="w-full flex items-center justify-between px-6 py-4 rounded-full font-bold text-lg cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            <span className="flex items-center gap-2 text-[15px]">
                                                {processing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                                Buy Now Directly
                                            </span>
                                            <div className="bg-white text-blue-600 px-4 py-1.5 rounded-full shadow-sm">
                                                <PriceTag price={design.price} />
                                            </div>
                                        </button>
                                    </div>
                                )}

                                <p className="text-center font-medium text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
                                    <Clock size={14} /> Instant Access • Lifetime Download
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-20 border-t border-gray-200 pt-16 lg:col-span-12">
                    <div className="flex items-center gap-3 mb-10">
                        <MessageSquare size={28} className="text-blue-500" />
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Customer Reviews</h2>
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-gray-600">{reviews.length}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Write a review */}
                        <div>
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Write a Review</h3>
                                <p className="text-sm text-gray-500 font-medium mb-6">Share your experience with this design. What machine did you use?</p>

                                {user ? (
                                    (hasPurchased || design.price === 0) ? (
                                        <form onSubmit={handleSubmitReview}>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={28}
                                                            onClick={() => setMyRating(star)}
                                                            className={`cursor-pointer transition-colors ${myRating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Your Comment (Max 500)</label>
                                                <textarea
                                                    required
                                                    maxLength={500}
                                                    rows={4}
                                                    value={myComment}
                                                    onChange={(e) => setMyComment(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 resize-none"
                                                    placeholder="This design cut perfectly on my Genmitsu PRO..."
                                                ></textarea>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={submittingReview}
                                                className="w-full py-4 bg-[#111] text-white rounded-xl font-bold text-[15px] hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {submittingReview ? 'Submitting...' : 'Post Review'}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100 font-medium">
                                            You must purchase this design before you can leave a review.
                                        </div>
                                    )
                                ) : (
                                    <div className="bg-gray-50 text-gray-500 p-4 rounded-xl border border-gray-200 font-medium text-center">
                                        Please login to leave a review for this design.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Read reviews */}
                        <div className="space-y-6">
                            {reviews.length === 0 ? (
                                <div className="text-gray-400 font-medium text-center py-10 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    No reviews yet. Be the first to share your experience! {/* Fix #10: was 'code block' typo */}
                                </div>
                            ) : (
                                reviews.map((rev) => (
                                    <div key={rev._id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="font-bold text-gray-900">{rev.user?.name || 'Customer'}</div>
                                            <div className="text-xs font-medium text-gray-400">
                                                {new Date(rev.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 text-yellow-400 mb-3">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "" : "text-gray-300"} />
                                            ))}
                                        </div>
                                        <p className="text-gray-600 text-sm font-medium leading-relaxed">
                                            {rev.comment}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Designs */}
                {relatedDesigns.length > 0 && (
                    <div className="mt-20 border-t border-gray-200 pt-16 lg:col-span-12">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-8">Related Designs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedDesigns.map(rel => {
                                const relFmt = getFileFormat(rel);
                                return (
                                    <Link key={rel._id} to={`/design/${rel._id}`} className="group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer">
                                        <figure className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-gray-50 mb-4 shrink-0">
                                            <img src={rel.previewImages?.[0] || placeholderImg} alt={rel.title} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                            {relFmt && <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white backdrop-blur-md ${formatBadgeStyle[relFmt] || 'bg-white/90 text-gray-800'}`}>{relFmt}</div>}
                                        </figure>
                                        <div className="px-2 pb-2 flex flex-col grow justify-between">
                                            <div>
                                                <h3 className="text-md font-bold text-gray-900 leading-snug mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{rel.title}</h3>
                                                <p className="text-xs font-medium text-gray-400 truncate mb-3">{rel.uploadedBy?.name || 'Creator'}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full capitalize">{rel.category || 'CNC'}</span>
                                                <div className="bg-[#111] text-white px-3 py-1 rounded-full font-bold text-xs shadow-sm group-hover:bg-blue-600 transition-colors">
                                                    <PriceTag price={rel.price} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>

            {/* Edit Design Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                            <h2 className="text-xl font-black text-gray-900">Edit Design Details</h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto grow">
                            <form id="editDesignForm" onSubmit={handleEditSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">Category</label>
                                        <select
                                            required
                                            value={editForm.category}
                                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 capitalize"
                                        >
                                            <option value="routers">Wood Routers</option>
                                            <option value="spindles">Spindles & Turning</option>
                                            <option value="carvings">3D Carvings / Bas Reliefs</option>
                                            <option value="furniture">Furniture Plans</option>
                                            <option value="reliefs">Panel Reliefs</option>
                                            <option value="v-bits">V-Bit Engraving</option>
                                            <option value="2d-designs">2D Designs</option>
                                            <option value="2d-grill-designs">2D Grill Designs</option>
                                            <option value="3d-designs">3D Designs</option>
                                            <option value="3d-traditional">3D Traditional Designs</option>
                                            <option value="temple-designs">Temple Designs</option>
                                            <option value="3d-doors-design">3D Doors Design</option>
                                            <option value="3d-modern-panel-doors">3D Modern Panel Doors</option>
                                            <option value="3d-latest-panel-door">3D Latest Panel Door</option>
                                            <option value="3d-borderless-mdf-door">3D Borderless MDF Door</option>
                                            <option value="3d-traditional-panel-door">3D Traditional Panel Door</option>
                                            <option value="3d-unique-door">3D Unique Door</option>
                                            <option value="other">Other / General</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">Price (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={editForm.price}
                                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 tracking-wide">Description</label>
                                    <textarea
                                        required
                                        rows="5"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 resize-none"
                                    ></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                type="button"
                                className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-[15px] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                form="editDesignForm"
                                type="submit"
                                disabled={updatingDesign}
                                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[15px] hover:bg-blue-700 shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {updatingDesign && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default DesignDetails;
