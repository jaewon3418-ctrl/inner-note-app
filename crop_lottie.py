import json
import copy

# Load the Lottie JSON file
with open(r'C:\Users\dhwod\Downloads\otro oso.json', 'r', encoding='utf-8') as f:
    lottie_data = json.load(f)

# Create a copy to modify
modified_data = copy.deepcopy(lottie_data)

# Modify the canvas height to crop the bear
if 'h' in modified_data:
    original_height = modified_data['h']
    # Crop to show only top half (or adjust as needed)
    modified_data['h'] = original_height // 2
    print(f"Original height: {original_height}")
    print(f"New height: {modified_data['h']}")

# Adjust layers if needed - shift all layers up to center the visible part
if 'layers' in modified_data:
    for layer in modified_data['layers']:
        # Adjust transform if exists
        if 'ks' in layer:
            # Position adjustment
            if 'p' in layer['ks']:
                # This shifts the bear up to show only upper body
                if 'k' in layer['ks']['p']:
                    if isinstance(layer['ks']['p']['k'], list):
                        # If it's animated (has keyframes)
                        if len(layer['ks']['p']['k']) > 0:
                            if isinstance(layer['ks']['p']['k'][0], dict):
                                # Keyframe animation
                                for keyframe in layer['ks']['p']['k']:
                                    if 's' in keyframe and len(keyframe['s']) > 1:
                                        # Move up by quarter of original height to center upper body
                                        keyframe['s'][1] -= original_height // 4
                            elif len(layer['ks']['p']['k']) > 1:
                                # Static position [x, y]
                                layer['ks']['p']['k'][1] -= original_height // 4

# Save the modified file
output_path = r'C:\Users\dhwod\TestApp\assets\animations\otro_oso_cropped.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(modified_data, f, ensure_ascii=False)

print(f"\nCropped animation saved to: {output_path}")
print("\nTo use in your React Native app:")
print("""
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/animations/otro_oso_cropped.json')}
  autoPlay
  loop
  style={{ width: 200, height: 100 }} // Adjust height to half
/>
""")