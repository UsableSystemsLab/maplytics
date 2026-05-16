import asyncio
from playwright.async_api import async_playwright
import re
from urllib.parse import urlparse, unquote
import logging
import urllib.parse
import math

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def extract_lat_lng(url: str):
    """Extract latitude and longitude from a Google Maps URL.

    Looks for patterns like '@lat,lng,zoom' (most common)
    Example: https://www.google.com/maps/place/Example/@21.3240288,39.7034046,15z
    """
    logging.debug(f"Extracting lat/lng from URL: {url}")
    parsed = urlparse(url)
    lat = re.search(r"!3d(-?\d+\.\d+)", parsed.path)
    lon = re.search(r"!4d(-?\d+\.\d+)", parsed.path)
    if lat and lon:
        return float(lat.group(1)), float(lon.group(1))
    return None

def extract_title(url: str):
    """Extract place name from a Google Maps URL.

    Looks for patterns like '/place/Name/@' or '/search/Name/@'
    Example: https://www.google.com/maps/place/Example/@21.3240288,39.7034046,15z
    """
    logging.debug(f"Extracting title from URL: {url}")
    # 1. Extract encoded title after /place/
    parsed = urlparse(url)
    match = re.search(r"/place/([^/]+)", parsed.path)
    if match:
        decoded_title = unquote(match.group(1))
        return decoded_title.strip().replace('\u202d', '').replace('\u202c', '').replace('+', ' ')

    logging.warning(f"Could not extract title from URL: {url}")
    return None

async def extract_category(page):
    """Extract place category from the page."""
    try:
        return (
            await page.locator('button[jsaction*="category"]')
            .text_content()
        )
    except Exception as e:
        logging.warning(f"Failed to extract category: {e}")
        return None

async def extract_address(page):
    """Extract place address from the page."""
    try:
        address_raw = (
            await page.locator('button[data-item-id="address"]').text_content()
        )
        if address_raw:
            decoded_address = unquote(address_raw)
            cleaned = re.sub(r'[\u202a-\u202e\u2066-\u2069\u200e\u200f\ue000-\uf8ff]', '', decoded_address)
            return cleaned.strip()
    except Exception as e:
        logging.warning(f"Failed to extract address: {e}")
        return None 
async def extract_rating(page):
    """Extract place rating from the page."""
    try:
        element = page.locator('span[role="img"][aria-label*="stars"], span[role="img"][aria-label*="نجوم"], span[role="img"][aria-label*="نجمة"]').first
        aria_label = await element.get_attribute("aria-label", timeout=5000)
        if aria_label:
            match = re.search(r"(\d+[.,]?\d*)", aria_label)
            if match:
                return float(match.group(1).replace(",", "."))
    except Exception as e:
        logging.warning(f"Failed to extract rating: {e}")
        return None

async def extract_review_count(page):
    """Extract review count from the page."""
    try:
        element = page.locator('span[role="img"][aria-label*="reviews"], span[role="img"][aria-label*="مراجعة"], span[role="img"][aria-label*="تقييم"]').first
        aria_label = await element.get_attribute("aria-label", timeout=5000)
        if aria_label:
            cleaned = re.sub(r'[,،\s]', '', aria_label)
            match = re.search(r"(\d+)", cleaned)
            return int(match.group(1)) if match else None
    except Exception as e:
        logging.warning(f"Failed to extract review count: {e}")
        return None
    

async def search_places(query: str, max_results: int = 1, headless: bool = False, lat: float = None, lng: float = None, radius: float = None):
    """Search Google Maps for `query`, click the first result, and return its info.

    Returns a list with a single dict: {'name': str, 'url': str, 'lat': float, 'lng': float, ...}
    """
    logging.info(f"Starting search for: {query}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="ar-SA",
            timezone_id="Asia/Riyadh",
        )
        page = await context.new_page()

        await page.goto("https://www.google.com/maps", timeout=60000)

        # Find the search box and submit the query
        selectors = [
            'input[role="combobox"]',
            'input[name="q"]',
            'input.fontBodyMedium',
            'form input[autocomplete="off"]',
        ]
        search_input = None
        for selector in selectors:
            try:
                search_input = await page.wait_for_selector(selector, timeout=5000)
                if search_input:
                    break
            except Exception:
                continue

        if not search_input:
            await context.close()
            await browser.close()
            logging.error("Could not find the Google Maps search input")
            return []

        await search_input.fill(query)
        await asyncio.sleep(1)
        await page.keyboard.press("Enter")

        # Wait for search results to appear
        try:
            await page.wait_for_url(re.compile(r".*/(search|place)/.*"), timeout=20000)
        except Exception:
            await asyncio.sleep(3)

        await asyncio.sleep(1)

        # If the search landed directly on a place page, extract from current page
        if "/place/" in page.url:
            logging.info("Search landed directly on a place page")
            result = await _extract_place(page)
            await context.close()
            await browser.close()
            return [result] if result else []

        # Otherwise, click the first result card in the results feed
        first_link = None
        try:
            first_link = await page.wait_for_selector('a[href*="/place/"]', timeout=10000)
        except Exception:
            logging.warning("No place links found in search results")

        if not first_link:
            await context.close()
            await browser.close()
            return []

        logging.info("Clicking first search result")
        await first_link.click()

        # Wait for the place detail panel to load
        try:
            await page.wait_for_url(re.compile(r".*/place/.*"), timeout=15000)
        except Exception:
            await asyncio.sleep(3)

        await asyncio.sleep(2)

        result = await _extract_place(page)
        await context.close()
        await browser.close()

        return [result] if result else []


async def _extract_place(page) -> dict | None:
    """Extract place details from a Google Maps place detail page."""
    try:
        await page.wait_for_selector('img', timeout=10000)
    except Exception:
        pass

    await asyncio.sleep(1)

    current_url = page.url
    coords = extract_lat_lng(current_url)
    title = extract_title(current_url)
    category = await extract_category(page)
    address = await extract_address(page)
    rating = await extract_rating(page)
    review_count = await extract_review_count(page)

    if not coords:
        logging.warning(f"Could not extract coordinates from URL: {current_url}")

    return {
        "name": title,
        "url": current_url,
        "lat": coords[0] if coords else None,
        "lng": coords[1] if coords else None,
        "category": category,
        "address": address,
        "rating": rating,
        "review_count": review_count,
    }