import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getMyCart, toggleCart } from '../services/auth.service';
import { createOrder, verifyPayment, loadRazorpayScript } from '../services/payment.service';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PriceTag from '../components/PriceTag';
import placeholderImg from '../assets/wood_part_placeholder.png';

const Cart = () => {
    const { user, refreshUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [cartDesigns, setCartDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchCart = async () => {
        try {
            const response = await getMyCart();
            setCartDesigns(response.data.designs || []);
        } catch (error) {
            toast.error(error.message || 'Failed to load your cart');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setLoading(false);
            navigate('/login');
        }
    }, [user, navigate]);

    const handleRemoveFromCart = async (designId) => {
        try {
            await toggleCart(designId);
            toast.success('Removed from Cart');
            await fetchCart();
            refreshUser();
        } catch (error) {
            toast.error('Failed to remove from cart');
        }
    };

    const handleCheckout = async () => {
        if (cartDesigns.length === 0) return;

        try {
            setProcessing(true);
            const isLoaded = await loadRazorpayScript();

            if (!isLoaded) {
                toast.error('Razorpay SDK failed to load');
                return;
            }

            const designIds = cartDesigns.map(d => d._id);
            const orderData = await createOrder(designIds);

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy_key',
                amount: orderData.order.amount,
                currency: "INR",
                name: "CNC Market",
                description: `Purchase of ${cartDesigns.length} designs`,
                order_id: orderData.order.id,
                handler: async function (response) {
                    try {
                        toast.loading('Verifying payment...', { id: 'payment' });
                        await verifyPayment({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        toast.success('Payment successful! Designs added to your library.', { id: 'payment' });

                        await refreshUser();
                        navigate('/my-purchases');
                    } catch (err) {
                        toast.error(err.message || 'Payment verification failed', { id: 'payment' });
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                },
                theme: {
                    color: "#111111",
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            toast.error(error.message || 'Failed to initialize checkout');
        } finally {
            setProcessing(false);
        }
    };

    const subtotal = cartDesigns.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">

                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-10 flex items-center gap-3">
                    <ShoppingCart size={32} className="text-blue-500" />
                    Your Cart
                </h1>

                {loading ? (
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mt-20"></div>
                ) : cartDesigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                            <ShoppingCart size={40} className="text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Your cart is empty</h2>
                        <p className="text-base text-gray-500 font-medium mt-3 mb-8 text-center max-w-sm">
                            Looks like you haven't added anything to your cart yet.
                        </p>
                        <Link to="/" className="px-8 py-3.5 bg-[#111] text-white rounded-full font-bold text-[15px] hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all">
                            Browse Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Cart Items */}
                        <div className="lg:col-span-8 flex flex-col gap-4">
                            {cartDesigns.map(design => (
                                <div key={design._id} className="bg-white p-4 rounded-[2rem] border border-gray-100 flex items-center gap-6 shadow-sm">
                                    <div className="w-32 h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                                        <img
                                            src={design.previewImages?.[0] || placeholderImg}
                                            alt={design.title}
                                            className="w-full h-full object-cover mix-blend-multiply"
                                        />
                                    </div>
                                    <div className="grow">
                                        <Link to={`/design/${design._id}`} className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                                            {design.title}
                                        </Link>
                                        <p className="text-sm font-medium text-gray-400 mt-1">
                                            By {design.uploadedBy?.name || 'Creator'}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-3 pr-4">
                                        <div className="font-black text-xl text-gray-900">
                                            <PriceTag price={design.price} />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFromCart(design._id)}
                                            className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                        >
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm sticky top-28">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                                    <div className="flex justify-between items-center font-medium text-gray-500">
                                        <span>Items ({cartDesigns.length})</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-8">
                                    <span className="font-bold text-gray-900 text-lg">Total</span>
                                    <span className="font-black text-2xl text-blue-600">₹{subtotal.toFixed(2)}</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={processing}
                                    className="w-full py-4 flex items-center justify-center gap-2 rounded-full font-bold text-lg bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : (
                                        <>Checkout ({cartDesigns.length}) <ArrowRight size={20} /></>
                                    )}
                                </button>

                                <p className="text-center font-medium text-xs text-gray-400 mt-4 text-balance">
                                    You will instantly receive lifetime access to these designs.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
