/* eslint-disable @typescript-eslint/no-unused-vars */
import { TemoFileList } from "@/app/interface";
import DataStore from "@/app/stores/dataStore";
import { PlayerRef } from "@remotion/player";
import { inject, observer } from "mobx-react";
import { useEffect, useState } from "react";


interface PlayerControlProps {
    playerRef: PlayerRef
    dataStore?: DataStore
    fileList: TemoFileList[]
}
// @ts-expect-error no-unused-vars
const PlayerControl = inject('dataStore')(observer(({ playerRef, dataStore, fileList }: PlayerControlProps) => {
    const [list, setList] = useState<TemoFileList[]>()


    useEffect(() => {
        if (fileList.length) {
            console.log(fileList)
            setList(fileList)
        }
    }, [fileList])


    return (
        <div className="w-full h-24">
            <div>
                {list?.map((item: TemoFileList) => (
                    <div className="border-r-2 border-gray-400 border-solid">
                        <div className=" text-sm text-center flex-1">{item.text}</div>
                        <div className=" flex-1"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}))

export default PlayerControl