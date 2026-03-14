import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import PriceTag from './PriceTag';
import SellerBadge from './SellerBadge';
import placeholderImg from '../assets/wood_part_placeholder.png';
import getDesignFormat from '../utils/getDesignFormat';

const formatBadgeColor = {
    STL: 'bg-purple-100 text-purple-700',
    DXF: 'bg-blue-100 text-blue-700',
    SVG: 'bg-green-100 text-green-700'
};

const StarRating = ({ rating, count, size = 'sm' }) => {
    const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={12} 
                        className={`${sizeClasses} ${i < fullStars ? 'fill-amber-400 text-amber-400' : i === fullStars && hasHalfStar ? 'fill-amber-400/50 text-amber-400' : 'fill-gray-100 text-gray-300'}`}
                    />
                ))}
            </div>
            {count > 0 && (
                <span className="text-xs text-gray-500 font-medium">({count})</span>
            )}
        </div>
    );
};

const DesignCard = ({ design, user, onToggleWishlist, togglingWishlist }) => {
    const fmt = getDesignFormat(design);
    const hasRating = Number(design.avgRating) > 0;
    const reviewCount = design.reviewCount || 0;
    const wishlistIds = (user?.wishlist || []).map((item) => item?._id || item?.toString?.() || item);
    const isWishlisted = wishlistIds.includes(design._id);

    return (
        <Link to={`/design/${design._id}`} className="group bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer">
            <figure className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-gray-50 mb-4 shrink-0 p-3">
                <img
                    src={design.previewImages?.[0] || placeholderImg}
                    alt={design.title}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    draggable="false"
                    onError={(e) => { e.target.src = placeholderImg; }}
                />
                <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white backdrop-blur-md ${formatBadgeColor[fmt] || 'bg-white/90 text-gray-800'}`}>
                    {fmt}
                </div>

                <button
                    onClick={(e) => onToggleWishlist(e, design._id)}
                    disabled={togglingWishlist === design._id}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm hover:scale-110 transition-transform disabled:opacity-50 ${isWishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                >
                    <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
                
                {hasRating && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-sm flex items-center gap-1">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-gray-800">{design.avgRating.toFixed(1)}</span>
                    </div>
                )}
            </figure>

            <div className="px-2 pb-2 flex flex-col grow justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {design.title}
                    </h2>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-400 truncate">
                            {design.uploadedBy?.name || 'Unknown Creator'}
                        </p>
                        {design.uploadedBy?.sellerTier && design.uploadedBy.sellerTier !== 'none' && (
                            <SellerBadge tier={design.uploadedBy.sellerTier} size="sm" showLabel={false} />
                        )}
                    </div>
                    
                    {hasRating && (
                        <div className="mb-3">
                            <StarRating rating={design.avgRating} count={reviewCount} />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-auto">
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
};

export default DesignCard;
