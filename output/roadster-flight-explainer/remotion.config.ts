// Remotion CLI settings (studio, render and still all read this file). WebGL runs on SwiftShader through ANGLE:
// no GPU is assumed.
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(3);
Config.setOverwriteOutput(true);
