import * as React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer.tsx";
import { Button } from "@/components/ui/button.tsx";

type ButtonComponentProps = React.ComponentProps<typeof Button>;

type DrawerStore = {
  buttonClassName?: string;
  buttonVariant?: ButtonComponentProps["variant"];
  ButtonLabel:
    | string
    | React.ComponentType<{ size?: number; color?: string }>
    | React.ReactElement;
  drawerTitle: string;
  drawerContent: React.ReactElement | null;
  drawerSaveButtonLabel: string;
  drawerCancelButtonLabel: string;
};

export default function DrawerStore({
  drawerProps,
}: {
  drawerProps: DrawerStore;
}) {
  const { ButtonLabel, buttonClassName, buttonVariant } = drawerProps;

  const renderButtonLabel = () => {
    if (typeof ButtonLabel === "string") return ButtonLabel;
    if (React.isValidElement(ButtonLabel)) return ButtonLabel;
    return <ButtonLabel />;
  };

  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger
        render={
          <Button variant={buttonVariant} className={buttonClassName}>
            {renderButtonLabel()}
          </Button>
        }
      />
      <DrawerContent>
        <DrawerHeader className="border-b py-4">
          <DrawerTitle>
            <h3>{drawerProps.drawerTitle}</h3>
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {drawerProps.drawerContent}
        </div>
        <DrawerFooter>
          <div className="flex justify-end gap-4">
            <Button className="px-6 py-6">
              {drawerProps.drawerSaveButtonLabel}
            </Button>
            <DrawerClose
              render={<Button variant="outline" className="px-6 py-6" />}
            >
              {" "}
              {drawerProps.drawerCancelButtonLabel}{" "}
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
