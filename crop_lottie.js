const fs = require('fs');
const path = require('path');

// Load the Lottie JSON file
const inputPath = 'C:\\Users\\dhwod\\Downloads\\otro oso.json';
const outputPath = path.join(__dirname, 'assets', 'animations', 'otro_oso_cropped.json');

// Read the file
fs.readFile(inputPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    try {
        const lottieData = JSON.parse(data);
        const modifiedData = JSON.parse(JSON.stringify(lottieData)); // Deep copy

        // Store original height
        const originalHeight = modifiedData.h || 512;
        
        // Crop the canvas height to show only upper half
        if (modifiedData.h) {
            modifiedData.h = Math.round(originalHeight * 0.6); // Show 60% of the bear
            console.log(`Original height: ${originalHeight}`);
            console.log(`New height: ${modifiedData.h}`);
        }

        // Adjust all layers to shift content up
        if (modifiedData.layers) {
            modifiedData.layers.forEach(layer => {
                // Adjust transform if exists
                if (layer.ks && layer.ks.p && layer.ks.p.k) {
                    const positionData = layer.ks.p.k;
                    
                    // Shift up by 20% of original height to center the upper body
                    const shiftAmount = originalHeight * 0.2;
                    
                    if (Array.isArray(positionData)) {
                        if (positionData.length === 2 && typeof positionData[1] === 'number') {
                            // Static position [x, y]
                            positionData[1] -= shiftAmount;
                        } else if (positionData.length > 0 && typeof positionData[0] === 'object') {
                            // Keyframe animation
                            positionData.forEach(keyframe => {
                                if (keyframe.s && Array.isArray(keyframe.s) && keyframe.s.length > 1) {
                                    keyframe.s[1] -= shiftAmount;
                                }
                                if (keyframe.e && Array.isArray(keyframe.e) && keyframe.e.length > 1) {
                                    keyframe.e[1] -= shiftAmount;
                                }
                            });
                        }
                    }
                }
            });
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Save the modified file
        fs.writeFile(outputPath, JSON.stringify(modifiedData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return;
            }

            console.log(`\n✅ Cropped animation saved to: ${outputPath}`);
            console.log('\n📱 To use in your React Native app:');
            console.log(`
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/animations/otro_oso_cropped.json')}
  autoPlay
  loop
  style={{ width: 200, height: 120 }} // Adjusted height
/>
            `);
        });

    } catch (error) {
        console.error('Error processing JSON:', error);
    }
});