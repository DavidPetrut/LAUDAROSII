"""
Script pentru a face video-ul mai "zoomed out" adaugand padding negru in jur.
Video-ul original va fi scalat si centrat folosind margin/padding.
"""

from moviepy import VideoFileClip, ColorClip, CompositeVideoClip
from moviepy.video.fx import Margin
import os

# Configurare
INPUT_VIDEO = "washing_feet.mp4"
OUTPUT_VIDEO = "washing_feet_zoomed_out.mp4"
SCALE_PERCENT = 55  # Video-ul original va ocupa 55% din frame-ul nou

def process_video():
    """Proceseaza video-ul adaugand padding negru pentru efect zoomed out"""
    
    if not os.path.exists(INPUT_VIDEO):
        print(f"Error: {INPUT_VIDEO} not found!")
        return
    
    print(f"Loading video: {INPUT_VIDEO}")
    video = VideoFileClip(INPUT_VIDEO)
    
    orig_width, orig_height = video.size
    print(f"Original dimensions: {orig_width}x{orig_height}")
    print(f"Duration: {video.duration}s")
    
    # Calculeaza dimensiunile scalate
    scale_factor = SCALE_PERCENT / 100
    new_width = int(orig_width * scale_factor)
    new_height = int(orig_height * scale_factor)
    
    # Calculeaza padding-ul necesar pentru fiecare parte
    pad_left = (orig_width - new_width) // 2
    pad_right = orig_width - new_width - pad_left
    pad_top = (orig_height - new_height) // 2
    pad_bottom = orig_height - new_height - pad_top
    
    print(f"Scaling video to: {new_width}x{new_height} ({SCALE_PERCENT}%)")
    print(f"Padding: top={pad_top}, bottom={pad_bottom}, left={pad_left}, right={pad_right}")
    
    # Scaleaza video-ul
    scaled_video = video.resized((new_width, new_height))
    
    # Adauga margin/padding negru - aceasta metoda centreaza automat
    final = scaled_video.with_effects([
        Margin(
            left=pad_left,
            right=pad_right,
            top=pad_top,
            bottom=pad_bottom,
            color=(0, 0, 0)
        )
    ])
    
    print(f"Final dimensions: {final.size}")
    print(f"Saving to: {OUTPUT_VIDEO}")
    
    final.write_videofile(
        OUTPUT_VIDEO,
        codec="libx264",
        audio_codec="aac",
        fps=video.fps
    )
    
    # Curata resursele
    video.close()
    final.close()
    
    print(f"Done! Original: {os.path.getsize(INPUT_VIDEO)} bytes")
    print(f"New: {os.path.getsize(OUTPUT_VIDEO)} bytes")

if __name__ == "__main__":
    process_video()

