import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: {
      main: "#0a3da6",
      
    },
    secondary: {
      main: "#4c86ff",
    },
    error: {
      main: red.A400,
    },
  },
});

export default theme;
