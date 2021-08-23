import React, { useEffect, useState } from 'react';
import { unitsToPico } from '../../definitions/OmegaDefaults';
import { ModuleInfo } from './ModuleInfo';
import { PriceSelector } from './PriceSelector';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import './SellModuleInfo.css';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const SellModuleInfo = (props) => {
    const [price, setPrice] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const sellButtonClassName = 'sellButton' + (price > 0 ? '' : ' disabled');

    const handleConfirmOpen = () => {
        setConfirmOpen(true);
    };
    
    const handleConfirmClose = () => {
        setConfirmOpen(false);
    };

    const onSell = () => {
        props.onSell(props.tokenId, unitsToPico(price));
    }

    const onDestroy = () => {
        props.onDestroy(props.tokenId);
        handleConfirmClose();
    }

    return (
        <div className="SellModuleInfo">
            <ModuleInfo 
                module={props.module}
                tokenId={props.tokenId}/>
            {false &&
                <div className="destroyButton" onClick={handleConfirmOpen}>
                    <DeleteForeverIcon fontSize="large"/>
                </div>
            }
            <div className={sellButtonClassName} onClick={price > 0 ? onSell : null}>
                SELL
            </div>
            <PriceSelector 
                onChange={_price => setPrice(_price)}
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
                    This action is not reversible. You will receive half of the invested minerals back, but no tokens.
                </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <div onClick={handleConfirmClose} className="dialogButton">
                        Cancel
                    </div>
                    <div onClick={onDestroy} className="dialogButton">
                        Destroy
                    </div>
                </DialogActions>
            </Dialog>        
        </div>
    )
};