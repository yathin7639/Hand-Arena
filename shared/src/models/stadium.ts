export interface Stadium {
  id: string;
  name: string;
  location: string;
  image: string;
  description: string;
}

export const STADIUMS: Stadium[] = [
  {
    id: "hpca",
    name: "HPCA Stadium",
    location: "Dharamshala, India",
    image: "/hpca_stadium.jpg",
    description: "Play with the Himalayas in the background."
  },
  {
    id: "lords",
    name: "Lord's Cricket Ground",
    location: "London, England",
    image: "/lords_stadium.jpg",
    description: "The Home of Cricket."
  }
];
