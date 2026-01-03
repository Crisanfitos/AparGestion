/**
 * Booking.com Property Importer
 * Uses a CORS proxy to fetch and parse Booking.com property pages
 */

export interface ScrapedPropertyData {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    country?: string;
    maxGuests?: number;
    bedrooms?: number;
    bathrooms?: number;
    pricePerNight?: number;
    photos?: string[];
    amenities?: string[];
    bookingUrl?: string;
}

export interface ScrapeResult {
    success: boolean;
    data?: ScrapedPropertyData;
    error?: string;
    message?: string;
}

// Free CORS proxies to try
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
];

/**
 * Validates if a URL is a valid Booking.com property URL
 */
export function isValidBookingUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes('booking.com') && url.includes('/hotel/');
    } catch {
        return false;
    }
}

/**
 * Scrapes property data from a Booking.com URL using CORS proxies
 */
export async function scrapeBookingProperty(url: string): Promise<ScrapeResult> {
    if (!isValidBookingUrl(url)) {
        return {
            success: false,
            error: 'URL no válida. Debe ser un enlace de Booking.com\n\nEjemplo:\nhttps://www.booking.com/hotel/es/nombre-del-hotel.html'
        };
    }

    // Try each CORS proxy until one works
    for (const proxy of CORS_PROXIES) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            console.log('Trying proxy:', proxy);

            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'text/html',
                },
            });

            if (!response.ok) {
                console.log('Proxy failed with status:', response.status);
                continue;
            }

            const html = await response.text();

            // Check if we got actual content
            if (html.length < 1000 || !html.includes('booking')) {
                console.log('Proxy returned invalid content');
                continue;
            }

            // Parse the HTML
            const data = parseBookingHtml(html, url);

            if (data.name) {
                return {
                    success: true,
                    data,
                    message: 'Datos importados correctamente. Revisa y ajusta si es necesario.'
                };
            }
        } catch (err) {
            console.log('Proxy error:', err);
            continue;
        }
    }

    // If all proxies fail, try to extract from URL
    const urlData = extractFromUrl(url);
    if (urlData.name) {
        return {
            success: true,
            data: urlData,
            message: 'Solo se pudo extraer información básica del enlace. Completa los datos manualmente.'
        };
    }

    return {
        success: false,
        error: 'No se pudieron obtener los datos. Por favor, rellena el formulario manualmente.'
    };
}

/**
 * Parses Booking.com HTML to extract property data
 */
function parseBookingHtml(html: string, url: string): ScrapedPropertyData {
    const data: ScrapedPropertyData = {
        bookingUrl: url,
    };

    // Try to extract JSON-LD structured data first (most reliable)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
        try {
            const jsonLd = JSON.parse(jsonLdMatch[1]);
            if (jsonLd['@type'] === 'Hotel' || jsonLd['@type'] === 'Apartment' || jsonLd['@type'] === 'LodgingBusiness') {
                data.name = jsonLd.name;
                if (jsonLd.address) {
                    data.address = typeof jsonLd.address === 'string'
                        ? jsonLd.address
                        : jsonLd.address.streetAddress;
                    data.city = jsonLd.address.addressLocality;
                    data.country = jsonLd.address.addressCountry;
                }
                data.description = jsonLd.description;
            }
        } catch (e) {
            console.log('JSON-LD parse error:', e);
        }
    }

    // Extract property name
    if (!data.name) {
        const nameMatch = html.match(/class="[^"]*pp-header__title[^"]*"[^>]*>([^<]+)/i) ||
            html.match(/id="hp_hotel_name"[^>]*>([^<]+)/i) ||
            html.match(/<h2[^>]*class="[^"]*hp__hotel-name[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)/i);
        if (nameMatch) {
            data.name = cleanText(nameMatch[1]);
        }
    }

    // Extract address
    if (!data.address) {
        const addressMatch = html.match(/class="[^"]*hp_address_subtitle[^"]*"[^>]*>([^<]+)/i) ||
            html.match(/data-node_tt_id="location_score_tooltip"[^>]*>([^<]+)/i);
        if (addressMatch) {
            const fullAddress = cleanText(addressMatch[1]);
            data.address = fullAddress;

            // Try to extract city from address
            const cityMatch = fullAddress.match(/,\s*(\d+)\s+([^,]+)/);
            if (cityMatch) {
                data.city = cityMatch[2].trim();
            }
        }
    }

    // Extract description
    if (!data.description) {
        const descMatch = html.match(/id="property_description_content"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/class="[^"]*hp-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (descMatch) {
            // Remove HTML tags from description
            data.description = cleanText(descMatch[1].replace(/<[^>]+>/g, ' ')).substring(0, 500);
        }
    }

    // Extract bedrooms
    const bedroomMatch = html.match(/(\d+)\s*(?:dormitorio|bedroom|habitaci)/i);
    if (bedroomMatch) {
        data.bedrooms = parseInt(bedroomMatch[1]);
    }

    // Extract bathrooms
    const bathroomMatch = html.match(/(\d+)\s*(?:baño|bathroom|aseo)/i);
    if (bathroomMatch) {
        data.bathrooms = parseInt(bathroomMatch[1]);
    }

    // Extract max guests
    const guestsMatch = html.match(/(?:hasta|capacidad|acomoda)[^0-9]*(\d+)\s*(?:persona|huésped|guest)/i) ||
        html.match(/(\d+)\s*(?:persona|huésped|guest)/i);
    if (guestsMatch) {
        data.maxGuests = parseInt(guestsMatch[1]);
    }

    // Extract amenities
    const amenities: string[] = [];
    const amenityMatches = html.matchAll(/class="[^"]*(?:important_facility|hp_desc_important_facility)[^"]*"[^>]*>([^<]+)/gi);
    for (const match of amenityMatches) {
        const amenity = cleanText(match[1]);
        if (amenity && !amenities.includes(amenity)) {
            amenities.push(amenity);
        }
    }
    if (amenities.length > 0) {
        data.amenities = amenities;
    }

    // Extract country from URL if not found
    if (!data.country) {
        const countryMatch = url.match(/\/hotel\/([a-z]{2})\//i);
        if (countryMatch) {
            data.country = getCountryName(countryMatch[1]);
        }
    }

    return data;
}

/**
 * Extracts basic info from URL structure as fallback
 */
function extractFromUrl(url: string): ScrapedPropertyData {
    const data: ScrapedPropertyData = {
        bookingUrl: url,
    };

    try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split('/');

        const hotelIndex = pathParts.indexOf('hotel');
        if (hotelIndex !== -1 && pathParts.length > hotelIndex + 2) {
            const countryCode = pathParts[hotelIndex + 1];
            data.country = getCountryName(countryCode);

            let slug = pathParts[hotelIndex + 2];
            slug = slug.replace(/\.[a-z]{2}\.html$/i, '').replace(/\.html$/i, '');
            data.name = formatSlugToName(slug);
        }
    } catch (err) {
        console.error('Error parsing URL:', err);
    }

    return data;
}

function formatSlugToName(slug: string): string {
    return slug
        .split('-')
        .map(word => {
            if (['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a'].includes(word.toLowerCase())) {
                return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ')
        .trim();
}

function getCountryName(code: string): string {
    const countries: Record<string, string> = {
        'es': 'España', 'fr': 'Francia', 'it': 'Italia', 'pt': 'Portugal',
        'de': 'Alemania', 'uk': 'Reino Unido', 'gb': 'Reino Unido',
        'us': 'Estados Unidos', 'mx': 'México', 'ar': 'Argentina',
    };
    return countries[code.toLowerCase()] || code.toUpperCase();
}

function cleanText(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
