import {useState, useEffect} from 'react';
import { useSpotifyAuth } from './useSpotifyAuth';



function SwitchPlayList() {


    const [playList, setPlayList] = useState(false);
    const [accessToken] = useSpotifyAuth();



    if (accessToken) {
        return
    }




    




}
