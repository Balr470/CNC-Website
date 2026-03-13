import { Helmet } from 'react-helmet-async';

const SEO = ({
    title,
    description = "High-quality CNC designs, SVGs, and 3D STL models for professionals and hobbyists. Browse thousands of premium and free digital cutting files.",
    name = "CNC Marketplace",
    type = "website",
    url = typeof window !== 'undefined' ? window.location.href : "https://www.cncmarket.in",
    image = "https://www.cncmarket.in/og-image.jpg",
    keywords = "CNC designs, SVG files, STL models, DXF files, laser cutting, 3D printing, digital designs, CNC patterns",
    canonicalUrl,
    noindex = false,
    articleMeta = null
}) => {
    const currentUrl = canonicalUrl || url;
    
    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title ? `${title} | ${name}` : name}</title>
            <meta name='description' content={description} />
            <meta name='keywords' content={keywords} />
            <meta name='robots' content={noindex ? 'noindex, nofollow' : 'index, follow'} />
            <link rel="canonical" href={currentUrl} />

            {/* OpenGraph tags (for Facebook, LinkedIn, Discord etc.) */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title ? `${title} | ${name}` : name} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={name} />

            {/* Twitter cards */}
            <meta name="twitter:creator" content={name} />
            <meta name="twitter:card" content={type === 'article' ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={title ? `${title} | ${name}` : name} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
}

export default SEO;
