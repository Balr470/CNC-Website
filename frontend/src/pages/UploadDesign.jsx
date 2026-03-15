import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDesign } from '../services/design.service';
import toast from 'react-hot-toast';
import { UploadCloud, CheckCircle2, X, Zap, ArrowUp } from 'lucide-react';
import { categoryGroups } from '../content/categories';

const SUPPORTED_CNC_EXTENSIONS = ['dxf', 'stl', 'svg', 'obj', 'nc', 'gcode', 'tap', 'ngc', 'cmx', 'rlf', 'art', 'rar', 'rar4', 'zip'];
const SUPPORTED_CNC_ACCEPT = SUPPORTED_CNC_EXTENSIONS.map((ext) => `.${ext}`).join(',');
const MAX_PREVIEW_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_CNC_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB - handled by R2 for files >25MB
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const UploadProgressBar = ({ progress, uploadedBytes, totalBytes, uploadSpeed, status, estimatedTime }) => {
    const percentage = Math.min(progress, 100);
    
    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return 'Calculating...';
        if (seconds < 60) return `${seconds}s remaining`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s remaining`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m remaining`;
    };
    
    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            status === 'complete' ? 'bg-green-100' : status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                            {status === 'complete' ? (
                                <CheckCircle2 size={16} className="text-green-600" />
                            ) : status === 'error' ? (
                                <X size={16} className="text-red-600" />
                            ) : (
                                <ArrowUp size={16} className="text-blue-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                {status === 'complete' ? 'Upload Complete!' : status === 'error' ? 'Upload Failed' : 'Uploading...'}
                            </p>
                            <p className="text-xs text-gray-500">{formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}</p>
                        </div>
                    </div>
                    <span className="text-lg font-black text-gray-900">{percentage}%</span>
                </div>
                
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                            status === 'complete' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                
                {status === 'uploading' && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <Zap size={12} className="text-amber-500" />
                            <span>{formatFileSize(uploadSpeed)}/s</span>
                        </div>
                        {estimatedTime && (
                            <span className="text-blue-600 font-medium">{formatTime(estimatedTime)}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const UploadDesign = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState('3d-designs');
    const [mainImage, setMainImage] = useState(null);
    const [additionalImages, setAdditionalImages] = useState([]);
    const [cncFile, setCncFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, complete, error
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState(null);
    
    const lastUpdateRef = useRef({ bytes: 0, time: Date.now() });
    const speedHistoryRef = useRef([]);
    const navigate = useNavigate();

    const startProgressSimulation = (total) => {
        lastUpdateRef.current = { bytes: 0, time: Date.now() };
        speedHistoryRef.current = [];
        setTotalBytes(total);
        setUploadedBytes(0);
        setUploadProgress(0);
        setUploadSpeed(0);
        setEstimatedTime(null);
        setUploadStatus('uploading');
    };

    const updateProgress = (bytesUploaded, total) => {
        const now = Date.now();
        
        setUploadedBytes(bytesUploaded);
        setTotalBytes(total);
        
        // Calculate real-time speed based on difference from last update
        const timeDiff = now - lastUpdateRef.current.time;
        const bytesDiff = bytesUploaded - lastUpdateRef.current.bytes;
        
        if (timeDiff > 100 && bytesDiff > 0) { // Update every 100ms minimum
            const instantSpeed = Math.round((bytesDiff / timeDiff) * 1000); // bytes per second
            
            // Smooth speed using moving average
            speedHistoryRef.current.push(instantSpeed);
            if (speedHistoryRef.current.length > 8) {
                speedHistoryRef.current.shift();
            }
            
            const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
            setUploadSpeed(avgSpeed);
            
            // Calculate estimated time remaining
            if (avgSpeed > 0 && bytesUploaded < total) {
                const remainingBytes = total - bytesUploaded;
                const remainingSeconds = Math.round(remainingBytes / avgSpeed);
                setEstimatedTime(remainingSeconds);
            }
            
            lastUpdateRef.current = { bytes: bytesUploaded, time: now };
        }
        
        // Calculate progress percentage
        const progress = total > 0 ? Math.round((bytesUploaded / total) * 100) : 0;
        setUploadProgress(progress);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!mainImage || !cncFile) {
            toast.error('Main image and CNC file are required!');
            return;
        }

        if (mainImage.size > MAX_PREVIEW_IMAGE_SIZE_BYTES) {
            toast.error(`Main image is ${formatFileSize(mainImage.size)}. Max allowed is 2.00 MB.`);
            return;
        }

        for (const img of additionalImages) {
            if (img.size > MAX_PREVIEW_IMAGE_SIZE_BYTES) {
                toast.error(`Additional image "${img.name}" is ${formatFileSize(img.size)}. Max allowed is 2.00 MB.`);
                return;
            }
        }

        if (cncFile.size > MAX_CNC_FILE_SIZE_BYTES) {
            toast.error(`CNC file is ${formatFileSize(cncFile.size)}. Max allowed is 100.00 MB.`);
            return;
        }

        const fileExtension = cncFile.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !SUPPORTED_CNC_EXTENSIONS.includes(fileExtension)) {
            toast.error(`Unsupported CNC file type. Allowed: ${SUPPORTED_CNC_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ')}`);
            return;
        }

        // Calculate total file size including all additional images
        const additionalImagesSize = additionalImages.reduce((acc, img) => acc + img.size, 0);
        const totalFileSize = mainImage.size + additionalImagesSize + cncFile.size;
        startProgressSimulation(totalFileSize);
        setLoading(true);
        
        const handleUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
                updateProgress(progressEvent.loaded, progressEvent.total);
            }
        };
        
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('price', Number(price));
            formData.append('category', category);
            formData.append('mainImage', mainImage);
            additionalImages.forEach((img) => {
                formData.append('additionalImages', img);
            });
            formData.append('cnc', cncFile);

            await uploadDesign(formData, handleUploadProgress);

            setUploadProgress(100);
            setUploadedBytes(totalFileSize);
            setUploadSpeed(0);
            setEstimatedTime(null);
            setUploadStatus('complete');
            toast.success('Design uploaded successfully!');
            
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            setUploadStatus('error');
            toast.error(error.message || 'Upload failed');
            setTimeout(() => {
                setUploadStatus('idle');
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Upload New Design
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-2">Publish premium CNC files and start earning instantly.</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 sm:p-12">

                        <div className="space-y-8">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">1</span> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Design Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                            placeholder="e.g., 3D Parametric Wooden Elephant"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Detailed Description</label>
                                        <textarea
                                            name="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                            rows={5}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                            placeholder="Describe materials, tools used, and assembly instructions..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                        <select
                                            name="category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            required
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900"
                                        >
                                            {categoryGroups.map((group) => (
                                                <optgroup key={group.title} label={group.title}>
                                                    {group.items.map((item) => (
                                                        <option key={item.value} value={item.value}>{item.label}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Price (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                name="price"
                                                min="0"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                                                required
                                                className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                                placeholder="0 for free"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium mt-2 flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Free designs will show as "Download Free"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Files */}
                            <div className="pt-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">2</span> Attached Files
                                </h3>

                                <div className="space-y-6">
                                    {/* Main Image */}
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed hover:border-blue-400 hover:bg-blue-50/50 transition-colors group">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 cursor-pointer">
                                            Main Image (Cover) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setMainImage(e.target.files[0])}
                                            required
                                            className="w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#111] file:text-white hover:file:bg-black cursor-pointer"
                                        />
                                        {mainImage && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <img 
                                                    src={URL.createObjectURL(mainImage)} 
                                                    alt="Main preview" 
                                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                                />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold">{mainImage.name}</p>
                                                    <p className="text-xs text-gray-400">{formatFileSize(mainImage.size)}</p>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium">This will be the main thumbnail for your design. Use high-quality 4:3 images (JPG, PNG, WEBP). Recommended size: 1200x900px. Max 2MB.</p>
                                    </div>

                                    {/* Additional Images */}
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed hover:border-green-400 hover:bg-green-50/50 transition-colors group">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 cursor-pointer">
                                            Additional Images <span className="text-gray-400 font-normal">(optional, max 5)</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files);
                                                if (files.length + additionalImages.length > 5) {
                                                    toast.error('Maximum 5 additional images allowed');
                                                    return;
                                                }
                                                setAdditionalImages(prev => [...prev, ...files].slice(0, 5));
                                            }}
                                            className="w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
                                        />
                                        {additionalImages.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {additionalImages.map((img, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                                                        <div className="flex items-center gap-3">
                                                            <img 
                                                                src={URL.createObjectURL(img)} 
                                                                alt={`Additional ${index + 1}`} 
                                                                className="w-14 h-14 object-cover rounded-lg"
                                                            />
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-semibold truncate max-w-[200px]">{img.name}</p>
                                                                <p className="text-xs text-gray-400">{formatFileSize(img.size)}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== index))}
                                                            className="p-1.5 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium">Add more images to show different angles or details of your design. Max 5 images, 2MB each.</p>
                                    </div>

                                    {/* CNC File */}
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed hover:border-purple-400 hover:bg-purple-50/50 transition-colors group">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 cursor-pointer">
                                            CNC Source File <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept={SUPPORTED_CNC_ACCEPT}
                                            onChange={(e) => setCncFile(e.target.files[0])}
                                            required
                                            className="w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                                        />
                                        {cncFile && (
                                            <p className="text-xs text-gray-500 mt-3 font-semibold">
                                                Selected: {cncFile.name} ({formatFileSize(cncFile.size)})
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium">Supported: DXF, STL, SVG, OBJ, NC, GCODE, TAP, NGC, CMX, RLF, ART, RAR, RAR4, ZIP. Max 100MB (files >25MB stored on R2).</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-400 font-medium max-w-sm">By publishing, you agree to our creator terms. Preview images are stored on Cloudinary and CNC source files are stored securely on Appwrite/R2.</p>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-10 py-4 bg-[#111] text-white rounded-full font-bold text-[15px] shadow-sm hover:shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={18} /> Publish to Store
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Upload Progress Bar */}
            {uploadStatus !== 'idle' && (
                <UploadProgressBar 
                    progress={uploadProgress}
                    uploadedBytes={uploadedBytes}
                    totalBytes={totalBytes}
                    uploadSpeed={uploadSpeed}
                    status={uploadStatus}
                    estimatedTime={estimatedTime}
                />
            )}
        </div>
    );
};

export default UploadDesign;
