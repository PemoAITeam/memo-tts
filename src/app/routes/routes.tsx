import { inject, observer } from 'mobx-react'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

// import SystemUsage from '@/app/components/SystemUsage'
import { Button } from '@/app/components/ui/button'
import HomePage from '@/app/pages/home/home'
import DataStore from '@/app/stores/dataStore'
import { IconType } from 'react-icons'
import './routes.scss'
import AppStore from '@/app/stores/appStore'
import { TbHome, TbPlaylist } from "react-icons/tb";
import HistoryPage from '@/app/pages/history/history'
import { useTranslation } from 'react-i18next'

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
        <div className='flex h-full'>
            <div className={`px-2 flex-shrink-0 h-full bg-background border-r page-left-tabs`}>
                <div className='temo-no-draggable mt-4'>
                    {sidebarItems.map((section) => (
                        <div key={section.id}>
                            <Button variant={selectedId === section.id ? "default" : "ghost"} onClick={() => changeTab(section)} className={`cursor-pointer w-full justify-start mb-1`}>
                                <section.icon size='20' />
                                <span>{section.label}</span>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`flex-1 overflow-x-hidden h-full bg-background page-right-content`}>
                <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<HomePage />}></Route>
                    <Route path="/history/:id?" element={<HistoryPage />}></Route>
                </Routes>
            </div>
        </div>
    </>

}))

export default Routers
