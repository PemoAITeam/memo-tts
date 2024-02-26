import { Player } from "@remotion/player";
import { MyComp } from "@/remotion/myComp";

export const RemotionPage: React.FC = () => {
    return (
        <div className=" h-full temo-draggable pt-6">
            <div className="h-full w-full temo-no-draggable">
                <Player
                    component={MyComp}
                    inputProps={{ text: "World" }}
                    durationInFrames={120}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    fps={30}
                    style={{
                        width: '100%',
                        height: 720,
                    }}
                    controls
                />
            </div>
        </div>
    );
};