import { useEffect, useState } from 'react';
import { useGetStateQuery } from '../../client/bootstrapperApi';
import { useNavigate } from 'react-router-dom'; // For navigation
import { setCloudCredentials, setCloudProvider } from '../../store/installation/bootstrapperSlice';
import { useDispatch } from 'react-redux';

export default function RehydrateAndRedirect() {
    const [hasHydrated, setHasHydrated] = useState(false); 
    const { data: state, isLoading } = useGetStateQuery();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (!isLoading && state && !hasHydrated) {
            // Update Redux state (using dispatch or however you set the global state)
            dispatch(setCloudCredentials(state.credentials));
            dispatch(setCloudProvider(state.provider));

            setHasHydrated(true); 
        }
    }, [isLoading, state, navigate, dispatch, hasHydrated]);

    return null;
}