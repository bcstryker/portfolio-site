import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Home.module.css';


const NextPageButton: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/test');
    };

    return (
        <button
            className={styles.nextPageButton}
            onClick={handleClick}
        >
            Next Page
        </button>
    );
};

export default NextPageButton;