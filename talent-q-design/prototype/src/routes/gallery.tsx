// Indexed interaction-state gallery: states the journeys reach, each inspectable on its own.
import { registerRoute } from './registry';
import { StatesGallery } from '../journeys/gallery/StatesGallery';
import '../styles/gallery.css';

registerRoute({ path: '/gallery/states', side: 'public', bare: true, label: 'interaction states', render: () => <StatesGallery /> });
