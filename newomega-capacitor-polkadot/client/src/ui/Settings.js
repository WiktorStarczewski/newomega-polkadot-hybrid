import './Settings.css';
import React, { useEffect, useState } from 'react';
import { Plugins } from '@capacitor/core';
import { OmegaDefaults } from '../definitions/OmegaDefaults';
import Snackbar from '@material-ui/core/Snackbar';
import QRCode from 'react-qr-code';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';

const { Storage } = Plugins;
const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});


export const Settings = (props) => {
    const [toastOpen, setToastOpen] = useState(false);
    const [mnemonic, setMnemonic] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirmOpen = () => {
        setConfirmOpen(true);
    };
    
    const handleConfirmClose = () => {
        setConfirmOpen(false);
    };

    /**
     * Copies the address to clipboard.
     */
    const copyAddressToClipboard = () => {
        navigator.clipboard.writeText(props.address).then(() => {
            setToastOpen(true);
        });
    }

    /**
     * Handler for closing toasts.
     */
    const onToastClose = () => {
        setToastOpen(false);
    }

    useEffect(() => {
        const asyncHandler = async () => {
            const result = await Storage.get({ key: 'OmegaMnemonic' });
            setMnemonic(result.value);
        };

        asyncHandler();
    }, []);

    const qrCodeValue = `substrate://${props.address}`;

    return (
        <div className="Settings">
            <div className="ui">
                <div className="mainTitle">
                </div>
                <div className="mainMenu">
                    <div className="qr">
                        <QRCode value={qrCodeValue} size={128}/>
                    </div>
                    <div className="info" onClick={copyAddressToClipboard}>
                        <div className="network">
                            Network: {OmegaDefaults.NETWORK}
                        </div>
                        <div className="address">
                            Address: <span className="guid">{props.address}</span>
                        </div>
                        <div className="balance">
                            Balance: {props.balance}
                        </div>
                        <div className="mnemonic">
                            Mnemonic: <span className="mnemonic-content">{mnemonic}</span>
                        </div>
                    </div>
                </div>
                <div className="uiElement doneBox bottomBox" onClick={props.onCancel}>
                    BACK
                </div>
                <div className="uiElement cancelBox bottomBox" onClick={handleConfirmOpen}>
                    LOGOUT
                </div>
            </div>
            <Snackbar
                open={toastOpen}
                autoHideDuration={3000}
                onClose={onToastClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                message="Address copied to clipboard."
            />
            <Dialog
                open={confirmOpen}
                TransitionComponent={Transition}
                keepMounted
                onClose={handleConfirmClose}
                aria-labelledby="alert-dialog-slide-title"
                aria-describedby="alert-dialog-slide-description"
            >
                <DialogTitle id="alert-dialog-slide-title">{"Are you sure?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-slide-description">
                    Make sure you backed up your mnemonic phrase, it is the ONLY way to access your account. If it is lost, it can not be recovered.
                </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <div onClick={handleConfirmClose} className="dialogButton">
                        Cancel
                    </div>
                    <div onClick={props.onLogout} className="dialogButton">
                        Log Out
                    </div>
                </DialogActions>
            </Dialog>        
        </div>
    );
};
