import {
  IconLayoutDashboard,
  IconUsers,
  IconMessageChatbot,
  IconAdjustmentsHorizontal,
  IconTicket,
  IconDatabase,
  IconCircleDot,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  // {
  //   id: uniqueId(),
  //   title: "Dashboard",
  //   icon: IconLayoutDashboard,
  //   href: "/",
  //   roles: ["Admin"],
  // },
    {
    id: uniqueId(),
    title: "Chat",
    icon: IconMessageChatbot,
    href: "/chat",
    roles: ["Admin", "User"],
  },
  {
    id: uniqueId(),
    title: "Users",
    icon: IconUsers,
    href: "/users",
    roles: ["Admin"],
  },
  {
    id: uniqueId(),
    title: "Configuration",
    icon: IconAdjustmentsHorizontal,
    href: "/config",
    roles: ["Admin"],
  },
  {
    id: uniqueId(),
    title: "Manage documents",
    icon: IconDatabase,
    href: "/documents",
    roles: ["Admin"],
  },
  {
    id: uniqueId(),
    title: "Tickets",
    icon: IconTicket,
    href: "#",
    roles: ["Admin"],
    children: [
      {
        id: uniqueId(),
        title: "All Tickets",
        icon: IconCircleDot,
        href: "/tickets",
        roles: ["Admin"],
      },
      {
        id: uniqueId(),
        title: "My Tickets",
        icon: IconCircleDot,
        href: "/my-tickets",
        roles: ["Admin"],
      },
    ],
  },
  {
    id: uniqueId(),
    title: "My Tickets",
    icon: IconTicket,
    href: "/my-tickets",
    roles: ["User"],
  },
];

export default Menuitems;
