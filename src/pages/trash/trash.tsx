import {
  CaretSortIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { inject, observer } from "mobx-react"
import DataStore from "@/stores/dataStore"
import AppStore from "@/stores/appStore"
import { formatTimestamp } from "@/lib/utils"

interface TrashPageProps {
  dataStore?: DataStore
  appStore?: AppStore
}

export type TemoColumn = {
  uuid: string
  title: string
  type?: string //'audio' | 'video'
  duration?: string
  date?: string
}



const TrashPage = inject('dataStore', 'appStore')(observer(({ dataStore }: TrashPageProps) => {

  const [list, setList] = useState<TemoColumn[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  useEffect(() => {
    dataStore?.getTrashData()
  }, [])

  useEffect(() => {
    if (dataStore?.trashData) {
      const columns = dataStore.trashData.map(item => ({
        uuid: item.uuid,
        title: item.title,
        duration: item.duration,
        date: formatTimestamp(item.date!),
        type: item.metadata?.format_name === 'mp3' ? 'audio' : 'video'
      }))
      setList(columns)
      console.log(dataStore.trashData)
    }
  }, [dataStore?.trashData])

  const handleDelete = async (id?: string) => {
    let datas: any = []
    if (!id) {
      datas = table.getFilteredSelectedRowModel().rows.map(info => dataStore?.trashData.find(item => item.uuid === info.original.uuid))
    } else {
      datas.push(dataStore?.trashData.find(item => item.uuid === id))
    }
    console.log(datas)
    dataStore?.deleteTrashData(datas, true)
  }

  const handleRecover = async (id?: string) => {
    let datas: any = []
    if (!id) {
      datas = table.getFilteredSelectedRowModel().rows.map(info => dataStore?.trashData.find(item => item.uuid === info.original.uuid))
    } else {
      datas.push(dataStore?.trashData.find(item => item.uuid === id))
    }
    console.log(datas)
    if (datas.length) {
      dataStore?.deleteTrashData(datas)
    }
  }

  const columns: ColumnDef<TemoColumn>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            标题
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="capitalize text-left">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => <div className="text-left">{row.getValue("type")}</div>,
    },
    {
      accessorKey: "duration",
      header: () => <div className="text-left">时长</div>,
      cell: ({ row }) => (
        <div className="capitalize text-left">{row.getValue("duration")}</div>
      ),
    },
    {
      accessorKey: "date",
      header: () => <div className="text-left">创建于</div>,
      cell: ({ row }) => (
        <div className="capitalize text-left">{row.getValue("date")}</div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-left">操作</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original
        console.log(payment)
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRecover(row.original.uuid)} >
                回撤
              </DropdownMenuItem>
              <DropdownMenuItem className=" text-red-500 focus:text-red-400" onClick={() => handleDelete(row.original.uuid)} >
                彻底删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: list,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="h-full temo-draggable pt-8 pb-4 px-4">
      <div className="h-full temo-no-draggable">
        <div className="flex items-center py-4">
          <Input
            placeholder="搜索标题"
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && <Button className="ml-2 px-2 h-7 bg-red-500 hover:bg-red-500/90" onClick={() => handleDelete()} >彻底删除</Button>}
          {table.getFilteredSelectedRowModel().rows.length > 0 && <Button className="ml-2 px-2 h-7" onClick={() => handleRecover()}>回撤</Button>}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} 项选中
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

}))

export default TrashPage