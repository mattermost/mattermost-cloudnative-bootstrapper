// /* eslint-disable jsx-a11y/anchor-is-valid */
import * as React from 'react';
// import { ColorPaletteProp } from '@mui/joy/styles';
// import Box from '@mui/joy/Box';
// import Button from '@mui/joy/Button';
// import Chip from '@mui/joy/Chip';
// import Divider from '@mui/joy/Divider';
// import FormControl from '@mui/joy/FormControl';
// import FormLabel from '@mui/joy/FormLabel';
// import Link from '@mui/joy/Link';
// import Input from '@mui/joy/Input';
// import Modal from '@mui/joy/Modal';
// import ModalDialog from '@mui/joy/ModalDialog';
// import ModalClose from '@mui/joy/ModalClose';
// import Select from '@mui/joy/Select';
// import Option from '@mui/joy/Option';
// import Table from '@mui/joy/Table';
// import Sheet from '@mui/joy/Sheet';
// import Checkbox from '@mui/joy/Checkbox';
// import IconButton, { iconButtonClasses } from '@mui/joy/IconButton';
// import Typography from '@mui/joy/Typography';
// import Menu from '@mui/joy/Menu';
// import MenuButton from '@mui/joy/MenuButton';
// import MenuItem from '@mui/joy/MenuItem';
// import Dropdown from '@mui/joy/Dropdown';
// // icons
// import FilterAltIcon from '@mui/icons-material/FilterAlt';
// import SearchIcon from '@mui/icons-material/Search';
// import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
// import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
// import BlockIcon from '@mui/icons-material/Block';
// import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
// import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
// import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
// import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
// import { useSelector } from 'react-redux';
// import { RootState } from '../store';
// import { useDispatch } from 'react-redux';
// import { fetchInstallations, incrementPage, decrementPage, selectInstallationsForPage, setInstallationStateFilter, selectInstallationsPagination, selectFilteredInstallationsForPage, setInstallationSizeFilter, setInstallationSearchTerm } from '../store/installation/installationSlice';
// import { Installation } from '../types/Installation';


// function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
//     if (b[orderBy] < a[orderBy]) {
//         return -1;
//     }
//     if (b[orderBy] > a[orderBy]) {
//         return 1;
//     }
//     return 0;
// }

// type Order = 'asc' | 'desc';

// function getComparator<Key extends keyof any>(
//     order: Order,
//     orderBy: Key,
// ): (
//     a: { [key in Key]: number | string },
//     b: { [key in Key]: number | string },
// ) => number {
//     return order === 'desc'
//         ? (a, b) => descendingComparator(a, b, orderBy)
//         : (a, b) => -descendingComparator(a, b, orderBy);
// }

// // Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// // stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// // only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// // with exampleArray.slice().sort(exampleComparator)
// function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
//     const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
//     stabilizedThis.sort((a, b) => {
//         const order = comparator(a[0], b[0]);
//         if (order !== 0) {
//             return order;
//         }
//         return a[1] - b[1];
//     });
//     return stabilizedThis.map((el) => el[0]);
// }

// function RowMenu() {
//     return (
//         <Dropdown>
//             <MenuButton
//                 slots={{ root: IconButton }}
//                 slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}
//             >
//                 <MoreHorizRoundedIcon />
//             </MenuButton>
//             <Menu size="sm" sx={{ minWidth: 140 }}>
//                 <MenuItem>Edit</MenuItem>
//                 <MenuItem>Rename</MenuItem>
//                 <MenuItem>Move</MenuItem>
//                 <Divider />
//                 <MenuItem color="danger">Delete</MenuItem>
//             </Menu>
//         </Dropdown>
//     );
// }

// export default function() {
//     const [order, setOrder] = React.useState<Order>('desc');
//     const [selected, setSelected] = React.useState<readonly string[]>([]);
//     const [open, setOpen] = React.useState(false);
//     const pagination = useSelector(selectInstallationsPagination);
//     const lastPage = useSelector((state: RootState) => state.installations.lastPage);
//     const dispatch = useDispatch();

//     const installations = useSelector(selectFilteredInstallationsForPage);

//     React.useEffect(() => {
//         if (installations.length === 0 || pagination.page * pagination.per_page > installations.length) {
//             dispatch(fetchInstallations(pagination) as any);
//         }
//     }, [dispatch, pagination])


//     const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
//         // event.target is the target input element
//         const newValue = event.target.value;
//         // Do something with newValue
//         dispatch(setInstallationSearchTerm(newValue));
//     };

//     const renderFilters = () => (
//         <React.Fragment>
//             <FormControl size="sm">
//                 <FormLabel>State</FormLabel>
//                 <Select
//                     size="sm"
//                     placeholder="Filter by state"
//                     slotProps={{ button: { sx: { whiteSpace: 'nowrap' } } }}
//                     onChange={(e, newValue) => {
//                         if (newValue === null) {
//                             dispatch(setInstallationStateFilter(''));
//                         }
//                         dispatch(setInstallationStateFilter(newValue as string));
//                     }}
//                 >
//                     <Option value="all">All</Option>
//                     <Option value="stable">stable</Option>
//                     <Option value="deleted">deleted</Option>
//                 </Select>
//             </FormControl>

//             <FormControl size="sm">
//                 <FormLabel>Size</FormLabel>
//                 <Select 
//                     size="sm"
//                     placeholder="All"
//                     onChange={(e, newValue) => {
//                         if (newValue === null) {
//                             dispatch(setInstallationSizeFilter(''));
//                         }
//                         dispatch(setInstallationSizeFilter(newValue as string));
//                     }}
//                 >
//                     <Option value="all">All</Option>
//                     <Option value="100users">100users</Option>
//                     <Option value="1000users">1000users</Option>
//                     <Option value="10000users">10000users</Option>
//                 </Select>
//             </FormControl>
//         </React.Fragment>
//     );
//     return (
//         <React.Fragment>
//             <Sheet
//                 className="SearchAndFilters-mobile"
//                 sx={{
//                     display: {
//                         xs: 'flex',
//                         sm: 'none',
//                     },
//                     my: 1,
//                     gap: 1,
//                 }}
//             >
//                 <Input
//                     size="sm"
//                     placeholder="Search"
//                     startDecorator={<SearchIcon />}
//                     sx={{ flexGrow: 1 }}
//                 />
//                 <IconButton
//                     size="sm"
//                     variant="outlined"
//                     color="neutral"
//                     onClick={() => setOpen(true)}
//                 >
//                     <FilterAltIcon />
//                 </IconButton>
//                 <Modal open={open} onClose={() => setOpen(false)}>
//                     <ModalDialog aria-labelledby="filter-modal" layout="fullscreen">
//                         <ModalClose />
//                         <Typography id="filter-modal" level="h2">
//                             Filters
//                         </Typography>
//                         <Divider sx={{ my: 2 }} />
//                         <Sheet sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                             {renderFilters()}
//                             <Button color="primary" onClick={() => setOpen(false)}>
//                                 Submit
//                             </Button>
//                         </Sheet>
//                     </ModalDialog>
//                 </Modal>
//             </Sheet>
//             <Box
//                 className="SearchAndFilters-tabletUp"
//                 sx={{
//                     borderRadius: 'sm',
//                     py: 2,
//                     display: {
//                         xs: 'none',
//                         sm: 'flex',
//                     },
//                     flexWrap: 'wrap',
//                     gap: 1.5,
//                     '& > *': {
//                         minWidth: {
//                             xs: '120px',
//                             md: '160px',
//                         },
//                     },
//                 }}
//             >
//                 <FormControl sx={{ flex: 1 }} size="sm">
//                     <FormLabel>Filter installations</FormLabel>
//                     <Input size="sm" onChange={handleSearchChange} placeholder="Search" startDecorator={<SearchIcon />} />
//                 </FormControl>
//                 {renderFilters()}
//             </Box>
//             <Sheet
//                 className="OrderTableContainer"
//                 variant="outlined"
//                 sx={{
//                     display: { xs: 'none', sm: 'initial' },
//                     width: '100%',
//                     borderRadius: 'sm',
//                     flexShrink: 1,
//                     overflow: 'auto',
//                     minHeight: 0,
//                 }}
//             >
//                 <Table
//                     aria-labelledby="tableTitle"
//                     stickyHeader
//                     hoverRow
//                     sx={{
//                         '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
//                         '--Table-headerUnderlineThickness': '1px',
//                         '--TableRow-hoverBackground': 'var(--joy-palette-background-level1)',
//                         '--TableCell-paddingY': '4px',
//                         '--TableCell-paddingX': '8px',
//                     }}
//                 >
//                     <thead>
//                         <tr>
//                             <th style={{ width: 48, textAlign: 'center', padding: '12px 6px' }}>
//                                 <Checkbox
//                                     size="sm"
//                                     indeterminate={
//                                         selected.length > 0 && selected.length !== installations.length
//                                     }
//                                     checked={selected.length === installations.length}
//                                     onChange={(event) => {
//                                         setSelected(
//                                             event.target.checked ? installations.map((installation) => installation.ID) : [],
//                                         );
//                                     }}
//                                     color={
//                                         selected.length > 0 || selected.length === installations.length
//                                             ? 'primary'
//                                             : undefined
//                                     }
//                                     sx={{ verticalAlign: 'text-bottom' }}
//                                 />
//                             </th>
//                             <th style={{ width: 140, padding: '12px 6px' }}>
//                                 <Link
//                                     underline="none"
//                                     color="primary"
//                                     component="button"
//                                     onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
//                                     fontWeight="lg"
//                                     endDecorator={<ArrowDropDownIcon />}
//                                     sx={{
//                                         '& svg': {
//                                             transition: '0.2s',
//                                             transform:
//                                                 order === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)',
//                                         },
//                                     }}
//                                 >
//                                     ID
//                                 </Link>
//                             </th>
//                             <th style={{width: 140, padding: '12px 6px' }}>Name</th>
//                             <th style={{ width: 50, padding: '12px 6px' }}>Creation Date</th>
//                             <th style={{ width: 100, padding: '12px 6px' }}>State</th>
//                             <th style={{ width: 50, padding: '12px 6px' }}>Size</th>
//                             <th style={{ width: 140, padding: '12px 6px' }}>Image</th>
//                             <th style={{ width: 50, padding: '12px 6px' }}>Version</th>
//                             <th style={{ width: 140, padding: '12px 6px' }}> </th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {stableSort(installations, getComparator(order, 'ID')).map((installation: Installation) => (
//                             <tr key={installation.ID}>
//                                 <td style={{ textAlign: 'center', width: 120 }}>
//                                     <Checkbox
//                                         size="sm"
//                                         checked={selected.includes(installation.ID)}
//                                         color={selected.includes(installation.ID) ? 'primary' : undefined}
//                                         onChange={(event) => {
//                                             setSelected((ids) =>
//                                                 event.target.checked
//                                                     ? ids.concat(installation.ID)
//                                                     : ids.filter((itemId) => itemId !== installation.ID),
//                                             );
//                                         }}
//                                         slotProps={{ checkbox: { sx: { textAlign: 'left' } } }}
//                                         sx={{ verticalAlign: 'text-bottom' }}
//                                     />
//                                 </td>
//                                 <td>
//                                     <Typography level="body-xs">{installation.ID}</Typography>
//                                 </td>
//                                 <td>
//                                     <Typography level="body-xs">{installation.Name}</Typography>
//                                 </td>
//                                 <td>
//                                     <Typography level="body-xs">{new Date(installation.CreateAt || 0).toLocaleDateString()}</Typography>
//                                 </td>
//                                 <td>
//                                     <Chip
//                                         variant="soft"
//                                         size="sm"
//                                         startDecorator={
//                                             {
//                                                 stable: <CheckRoundedIcon />,
//                                                 "update-in-progress": <AutorenewRoundedIcon />,
//                                                 "deleted": <BlockIcon />,
//                                             }[installation.State]
//                                         }
//                                         color={
//                                             {
//                                                 stable: 'success',
//                                                 "update-in-progress": 'neutral',
//                                                 "deleted": 'danger',
//                                             }[installation.State] as ColorPaletteProp
//                                         }
//                                     >
//                                         {installation.State}
//                                     </Chip>
//                                 </td>
//                                 <td>
//                                     <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                                         <div>
//                                             <Typography level="body-xs">{installation.Size}</Typography>
//                                         </div>
//                                     </Box>
//                                 </td>
//                                 <td>
//                                     <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                                         <div>
//                                             <Typography level="body-xs">{installation.Image}</Typography>
//                                         </div>
//                                     </Box>
//                                 </td>
//                                 <td>
//                                     <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                                         <div>
//                                             {Boolean(installation.Version.length > 15) ? (
//                                                 <Typography level="body-xs">{`${installation.Version.slice(0, 8)}...${installation.Version.slice(installation.Version.length - 8, installation.Version.length)}`}</Typography>
//                                             ) : (
//                                                 <Typography level="body-xs">{installation.Version}</Typography>
//                                             )}
//                                             </div>
//                                     </Box>
//                                 </td>
//                                 <td>
//                                     <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                                         <Link level="body-xs"  href={`/installations/${installation.ID}`} >
//                                             More Details
//                                         </Link>
//                                         <RowMenu />
//                                     </Box>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </Table>
//             </Sheet>
//             <Box
//                 className="Pagination-laptopUp"
//                 sx={{
//                     pt: 2,
//                     gap: 1,
//                     [`& .${iconButtonClasses.root}`]: { borderRadius: '50%' },
//                     display: {
//                         xs: 'none',
//                         md: 'flex',
//                     },
//                 }}
//             >
//                 <Button
//                     size="sm"
//                     variant="outlined"
//                     color="neutral"
//                     startDecorator={<KeyboardArrowLeftIcon />}
//                     onClick={() => dispatch(decrementPage())}
//                     disabled={pagination.page === 0}
//                 >
//                     Previous
//                 </Button>
//                 <Box sx={{ flex: 1 }} />
//                 <Button
//                     size="sm"
//                     variant="outlined"
//                     color="neutral"
//                     endDecorator={<KeyboardArrowRightIcon />}
//                     onClick={() => dispatch(incrementPage())}
//                     disabled={lastPage === pagination.page}
//                 >
//                     Next
//                 </Button>
//             </Box>
//         </React.Fragment>
//     );
// }