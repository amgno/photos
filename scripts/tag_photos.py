import os
import json
import base64
import mimetypes
import time
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic, APIError
from tqdm import tqdm

# Load environment variables
load_dotenv()

def get_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not found in environment variables.")
        return None
    return Anthropic(api_key=api_key)

def get_model():
    return os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def get_media_type(image_path):
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type in ['image/jpeg', 'image/png', 'image/webp']:
        return mime_type
    # Fallback for jpg if mime detection fails
    if str(image_path).lower().endswith(('.jpg', '.jpeg')):
        return 'image/jpeg'
    return None

def analyze_image(client, image_path):
    media_type = get_media_type(image_path)
    if not media_type:
        print(f"Skipping {image_path}: Unsupported format")
        return None

    base64_image = encode_image(image_path)

    system_prompt = """You are an expert image analysis assistant for a photo archive.
Your task is to analyze the provided image and extract structured metadata in JSON format.
You must respond EXCLUSIVELY with the JSON, with no introductory text or markdown.
All text fields must be in English."""

    user_prompt = """Analyze this image and return a JSON with the following structure:
{
  "photography": {
    "shot_type": "close-up/medium shot/wide shot/macro/aerial/etc",
    "orientation": "landscape/portrait/square",
    "lighting": "natural/artificial/harsh/soft/golden hour/backlit/etc",
    "composition": "rule of thirds/centered/symmetry/leading lines/etc",
    "subject_focus": "single subject/group/crowd/scenery/object",
    "style": "portrait/landscape/street/architectural/abstract/documentary/etc"
  },
  "objects": [
    {
      "name": "object name (in English)",
      "confidence": 0-100,
      "position": "position description (optional, in English)" 
    }
  ],
  "people": {
    "count": integer,
    "attributes": ["list", "of", "generic", "attributes", "e.g.: adult woman, running"]
  },
  "colors": [
    {
      "hex": "#RRGGBB",
      "percentage": 0-100
    }
  ],
  "scene": {
    "type": "indoor/outdoor/urban/nature/etc",
    "description": "brief scene description (in English)"
  }
}

Rules:
- DO NOT identify specific people (no proper names).
- For colors, extract the 3-5 dominant colors.
- Respond only with valid JSON.
- ENSURE ALL TEXT IS IN ENGLISH.
- Focus on photographic terminology for the 'photography' section."""

    try:
        message = client.messages.create(
            model=get_model(),
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ],
                }
            ],
        )
        
        response_text = message.content[0].text
        # Pulisci la risposta nel caso ci siano backticks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(response_text)

    except APIError as e:
        print(f"API Error for {image_path}: {e}")
        return None
    except json.JSONDecodeError:
        print(f"JSON Error for {image_path}: Could not parse response")
        print(f"Response was: {response_text}")
        return None
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}")
        return None

def process_directory(client, directory):
    directory = Path(directory)
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    images = [f for f in directory.iterdir() if f.suffix.lower() in image_extensions and f.is_file()]
    
    if not images:
        return

    metadata_file = directory / "metadata.json"
    existing_metadata = {}
    
    if metadata_file.exists():
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                existing_metadata = json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: Corrupted metadata file in {directory}")

    # Filter images that need processing
    images_to_process = [img for img in images if img.name not in existing_metadata]
    
    if not images_to_process:
        print(f"No new images in {directory}")
        return

    print(f"Processing {len(images_to_process)} images in {directory}")
    
    updated = False
    for image_path in tqdm(images_to_process):
        result = analyze_image(client, image_path)
        if result:
            existing_metadata[image_path.name] = result
            updated = True
            # Save incrementally to avoid losing data
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(existing_metadata, f, indent=2, ensure_ascii=False)
            
            # Sleep briefly to be nice to rate limits if needed (optional)
            time.sleep(1)

def main():
    client = get_client()
    if not client:
        return

    base_dir = Path("img")
    if not base_dir.exists():
        print("Directory 'img' not found.")
        return

    # Recursive scan
    for root, dirs, files in os.walk(base_dir):
        # Skip processing the root 'img' folder itself if it just contains subfolders
        # But if it has images, process them.
        # PRD says structure is /img/YYYY-MM-Descrizione/
        
        root_path = Path(root)
        process_directory(client, root_path)

if __name__ == "__main__":
    main()

