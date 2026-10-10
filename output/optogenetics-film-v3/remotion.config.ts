// Remotion CLI settings for this film (studio, render and still all read this file).
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setAudioBitrate('256k');
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
