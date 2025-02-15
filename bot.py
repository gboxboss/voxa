import os
import requests
from bs4 import BeautifulSoup

# We will consider these as valid image extensions:
IMAGE_EXTENSIONS = ('.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico')

# Optimuu domain prefixes to watch for:
OPTIMUU_PREFIXES = [
    "https://optimuu.com/wp-content/uploads",
    "https://www.optimuu.com/wp-content/uploads"
]

def download_image(image_url, images_dir):
    """
    Download the image to 'images_dir' if not already downloaded.
    Return the local filename if successful, else None.
    """
    # Extract the filename from the URL
    filename = image_url.split('/')[-1]
    local_path = os.path.join(images_dir, filename)

    # If already exists locally, skip downloading
    if os.path.exists(local_path):
        return filename

    print(f"  Downloading {filename} from {image_url} ...")
    try:
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        with open(local_path, 'wb') as f:
            f.write(resp.content)
        return filename
    except Exception as e:
        print(f"    Error downloading {image_url}: {e}")
        return None

def process_srcset(srcset_value, images_dir):
    """
    Parse 'srcset' attribute (which may contain multiple URLs + descriptors).
    Returns (new_srcset, changed_bool)
    """
    changed = False
    new_parts = []

    # srcset can be something like:
    #   "https://optimuu.com/wp-content/uploads/photo-500w.webp 500w,
    #    https://optimuu.com/wp-content/uploads/photo-300x300.webp 300w"
    for part in srcset_value.split(','):
        part = part.strip()
        if not part:
            continue

        # Usually "URL size" e.g. "https://... 500w"
        tokens = part.split()
        if len(tokens) < 1:
            new_parts.append(part)
            continue

        url = tokens[0]
        descriptor = " ".join(tokens[1:])  # e.g. "500w"

        # Check if this url starts with the domain + has an image extension
        if is_optimuu_image(url):
            local_name = download_image(url, images_dir)
            if local_name:
                changed = True
                url = f"images/{local_name}"

        if descriptor.strip():
            new_parts.append(f"{url} {descriptor}")
        else:
            new_parts.append(url)

    return (", ".join(new_parts), changed)

def is_optimuu_image(url):
    """
    Checks whether 'url' starts with one of the known Optimuu prefixes
    AND ends with one of our recognized image extensions.
    """
    # Quick filter: must start with our domain
    if not any(url.startswith(prefix) for prefix in OPTIMUU_PREFIXES):
        return False
    # Then check extension:
    lower_url = url.lower()
    return lower_url.endswith(IMAGE_EXTENSIONS)

def main():
    images_dir = "images"
    os.makedirs(images_dir, exist_ok=True)

    # Iterate over every .html file in the current dir
    for file_name in os.listdir("."):
        if not file_name.lower().endswith(".html"):
            continue

        print(f"\nProcessing {file_name} ...")
        with open(file_name, "r", encoding="utf-8") as f:
            html = f.read()

        soup = BeautifulSoup(html, "html.parser")
        file_modified = False

        # We'll scan *every* tag, and *every* attribute,
        # because e.g. <link>, <meta>, <img>, etc. can have image references.
        all_tags = soup.find_all(True)  # find all tags, not just images
        for tag in all_tags:

            # We handle 'srcset' specially if it’s present
            if tag.has_attr("srcset"):
                old_value = tag["srcset"]
                new_value, changed = process_srcset(old_value, images_dir)
                if changed:
                    tag["srcset"] = new_value
                    file_modified = True

            # Now check *all* attributes (src, href, content, etc.)
            for attr_name in list(tag.attrs.keys()):
                # skip 'srcset' because we already did it
                if attr_name.lower() == "srcset":
                    continue

                attr_value = tag.attrs[attr_name]
                # If it's not a string, skip
                if not isinstance(attr_value, str):
                    continue

                # If it’s an image from optimuu => download & replace
                if is_optimuu_image(attr_value):
                    local_name = download_image(attr_value, images_dir)
                    if local_name:
                        # forward slash in HTML
                        tag.attrs[attr_name] = f"images/{local_name}"
                        file_modified = True

        if file_modified:
            with open(file_name, "w", encoding="utf-8") as f:
                f.write(str(soup))
            print(f"  Updated references in {file_name}")
        else:
            print("  No matching optimuu.com images found.")

if __name__ == "__main__":
    main()
