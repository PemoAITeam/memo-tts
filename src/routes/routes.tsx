import { inject, observer } from 'mobx-react'
import { useEffect, useState } from 'react'
import {
    TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse,
} from "react-icons/tb"
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

// import SystemUsage from '@/components/SystemUsage'
import { Button } from '@/components/ui/button'
import HomePage from '@/pages/home/home'
import DataStore from '@/stores/dataStore'
import { IconType } from 'react-icons'
import './routes.scss'
import AppStore from '@/stores/appStore'
import { TbHome, TbTrash, TbPlaylist } from "react-icons/tb";
import HistoryPage from '@/pages/history/history'
import TrashPage from '@/pages/trash/trash'
import { useTranslation } from 'react-i18next'

const hideTabs = [
    /\/details/g,
    /\/edit/g,
    /\/subtitle/g
]

function checkHideTabs(str: string): boolean {
    let hide = false
    hideTabs.forEach(reg => {
        hide = hide || reg.test(str)
    })

    return hide
}

interface Routers {
    id: string,
    path?: string,
    icon: IconType,
    label: string,
    subItems?: { uuid: string, path?: string, title: string }[]
}

interface RouterPageProps {
    dataStore?: DataStore,
    appStore?: AppStore
}

const Routers = inject('dataStore', 'appStore')(observer(({ appStore }: RouterPageProps) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { hideBar, setHideBar } = appStore!
    const [selectedId, setSelectedId] = useState('home')
    const { t } = useTranslation()
    const [sidebarItems] = useState<Routers[]>([
        {
            id: 'home',
            path: '/home',
            icon: TbHome,
            label: 'Temo',
        },
        {
            id: 'history',
            path: '/history',
            icon: TbPlaylist,
            label: t('route.media list'),
        },
        {
            id: 'trash',
            path: '/trash',
            icon: TbTrash,
            label: t('route.trash'),
        },
        // {
        //     id: 'setting',
        //     label: '设置',
        //     icon: TbSettings
        // },
    ])
    

    useEffect(() => {
        navigate(`/home`)
        appStore?.setTemoId("home")
        return () => {
            appStore?.setTemoId("")
        }
    }, [])

    useEffect(() => {
        console.log(appStore?.temoId)
        if (appStore?.temoId && selectedId !== appStore.temoId) {
            setSelectedId(appStore?.temoId)
        }
    }, [appStore?.temoId, selectedId])

    const changeTab = (tabRoute: Routers) => {
        if (location.pathname === tabRoute.path) {
            return
        }
        setSelectedId(tabRoute.id)
        appStore?.setTemoId(tabRoute.id)
        if (tabRoute.path) {
            navigate(tabRoute.path)
        }
    }

    return <>
        <div className={`App-title h-12 ${(checkHideTabs(location.pathname) || hideBar) ? ' page-left-tabs__hide' : ''}`}>
            <Button className='temo-no-draggable rounded-full' onClick={() => setHideBar()} style={{ margin: '6px' }} variant={'ghost'} size={'icon'}>
                {!hideBar && <TbLayoutSidebarLeftCollapse size={20} />}
                {hideBar && <TbLayoutSidebarRightCollapse size={20} />}
            </Button>
        </div>
        <div className='flex h-full'>
            <div className={` px-4 flex-shrink-0 h-full bg-background border-r page-left-tabs ${(checkHideTabs(location.pathname) || hideBar) ? ' page-left-tabs__hide' : ''}`}>
                <div className='h-12 p-4'></div>
                <div className='temo-no-draggable mt-8'>
                    {sidebarItems.map((section) => (
                        <div key={section.id}>
                            <Button variant={selectedId === section.id ? "default" : "ghost"} onClick={() => changeTab(section)} className={`cursor-pointer w-full justify-start mb-1`}>
                                <section.icon size='20' className="mr-2" />
                                <span>{section.label}</span>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`flex-1 overflow-x-hidden h-full bg-background page-right-content ${(checkHideTabs(location.pathname) || hideBar) ? ' page-left-tabs__hide' : ''}`}>
                <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<HomePage />}></Route>
                    <Route path="/trash" element={<TrashPage />}></Route>
                    <Route path="/history/:id?" element={<HistoryPage />}></Route>
                </Routes>
            </div>
        </div>
    </>

}))

export default Routers
